import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FormField from '../components/FormField.jsx';
import LoadState from '../components/LoadState.jsx';
import CampaignEditor from '../components/CampaignEditor.jsx';
import useResource from '../hooks/useResource.js';
import { api } from '../lib/api.js';

export default function NewCampaignPage() {
  const { profile, products, campaigns } = useOutletContext();
  const config = useResource('/campaigns/config');
  const navigate = useNavigate();
  const [form, setForm] = useState({
    productId: '',
    goal: '',
    audience: '',
    platform: 'facebook',
    tone: 'friendly',
    language: 'English',
  });
  const [generated, setGenerated] = useState(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationFields, setGenerationFields] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saveFields, setSaveFields] = useState({});
  const resources = [profile, products, config];
  const ready = resources.every((resource) => !resource.loading && !resource.error);
  const canGenerate =
    ready && profile.data?.profile && products.data?.total > 0 && config.data?.configured;
  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  async function generate(event) {
    event.preventDefault();
    setGenerating(true);
    setGenerationError('');
    setGenerationFields({});
    try {
      const result = await api('/campaigns/generate', {
        method: 'POST',
        body: JSON.stringify(form),
        timeoutMs: 60000,
      });
      // Preserve the exact brief used, even if the owner edits the next request's fields.
      setGenerated(result);
      setDraftVersion((value) => value + 1);
      setSaveError('');
      setSaveFields({});
    } catch (error) {
      setGenerationError(error.message);
      setGenerationFields(error.fields || {});
    } finally {
      setGenerating(false);
    }
  }
  async function save(content) {
    setSaving(true);
    setSaveError('');
    setSaveFields({});
    try {
      const { campaign } = await api('/campaigns', {
        method: 'POST',
        body: JSON.stringify({ ...generated.brief, ...content }),
      });
      campaigns.reload();
      navigate(`/dashboard/campaigns/${campaign.id}`, { state: { justSaved: true } });
    } catch (error) {
      setSaveError(error.message);
      setSaveFields(error.fields || {});
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Link
        to="/dashboard/campaigns"
        className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-forest"
      >
        <ArrowLeft size={14} />
        All campaigns
      </Link>
      <PageHeader
        eyebrow="FROM LITTLE IDEA TO BIG HELLO"
        title="Let’s tell your story"
        description="Turn one product into three social post ideas. Review, edit, and save your draft."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <section className="panel min-w-0 space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Start with something special</h2>
          {resources.map(
            (resource, index) =>
              (resource.loading || resource.error) && (
                <LoadState
                  key={index}
                  resource={resource}
                  label={['business profile', 'products', 'campaign setup'][index]}
                />
              ),
          )}
          {ready && !profile.data?.profile && (
            <p className="text-sm leading-6 text-muted">
              <Link className="font-semibold text-forest underline" to="/dashboard/profile">
                Save your business profile
              </Link>{' '}
              so the campaign sounds like you.
            </p>
          )}
          {ready && products.data?.total === 0 && (
            <p className="text-sm leading-6 text-muted">
              <Link className="font-semibold text-forest underline" to="/dashboard/products">
                Add a product
              </Link>{' '}
              to give your campaign a starting point.
            </p>
          )}
          {ready && !config.data?.configured && (
            <p role="alert" className="text-sm text-red-700">
              Campaign generation is not configured yet. Please try again after setup.
            </p>
          )}
          <form onSubmit={generate}>
            <fieldset disabled={!canGenerate || generating || saving} className="min-w-0 space-y-5">
              <legend className="sr-only">Campaign details</legend>
              <FormField
                name="productId"
                label="Product"
                value={form.productId}
                onChange={change}
                error={generationFields.productId}
                required
              >
                <option value="">Choose a product</option>
                {products.data?.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.currency} {product.price}
                  </option>
                ))}
              </FormField>
              <FormField
                name="goal"
                label="Campaign goal"
                value={form.goal}
                onChange={change}
                error={generationFields.goal}
                multiline
                required
                maxLength={600}
                placeholder="Introduce our new handmade mugs and invite people to visit the shop."
              />
              <FormField
                name="audience"
                label="Who would you like to reach?"
                value={form.audience}
                onChange={change}
                error={generationFields.audience}
                required
                maxLength={300}
                placeholder="Local shoppers and people looking for gifts"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  name="platform"
                  label="Platform"
                  value={form.platform}
                  onChange={change}
                  error={generationFields.platform}
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </FormField>
                <FormField
                  name="tone"
                  label="Tone of voice"
                  value={form.tone}
                  onChange={change}
                  error={generationFields.tone}
                >
                  <option value="friendly">Warm & friendly</option>
                  <option value="professional">Professional</option>
                  <option value="playful">Playful</option>
                </FormField>
              </div>
              <FormField
                name="language"
                label="Language"
                value={form.language}
                onChange={change}
                error={generationFields.language}
              >
                <option>English</option>
                <option>Sinhala</option>
                <option>Tamil</option>
              </FormField>
              <p className="text-xs leading-5 text-muted">
                Generation sends your saved business details, the selected product, and this brief
                to Google Gemini. Use public business information.
              </p>
              <button className="button-primary w-full" type="submit">
                <Sparkles size={16} />
                {generating
                  ? 'Creating your draft…'
                  : generated
                    ? 'Generate a new draft'
                    : 'Generate campaign'}
              </button>
            </fieldset>
          </form>
          {generationError && (
            <p role="alert" className="text-sm text-red-700">
              {generationError}
            </p>
          )}
          {generating && (
            <p role="status" className="text-xs text-muted">
              This may take up to 45 seconds. Keep this page open.
            </p>
          )}
          {generated && (
            <p className="text-xs leading-5 text-muted">
              Generating again replaces the current draft when the new one is ready.
            </p>
          )}
        </section>
        <section className="panel min-w-0 p-5 sm:p-6" aria-label="Campaign draft">
          {generated ? (
            <>
              <p className="mb-4 text-xs text-muted">
                {generated.brief.platform === 'facebook' ? 'Facebook' : 'Instagram'} ·{' '}
                {generated.brief.language} · Draft for{' '}
                {products.data?.products.find((product) => product.id === generated.brief.productId)
                  ?.name || 'your selected product'}
              </p>
              <CampaignEditor
                key={draftVersion}
                draft={generated.draft}
                busy={saving || generating}
                error={saveError}
                fields={saveFields}
                onSave={save}
              />
            </>
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-[#d2dace] bg-[#f5f7f1] p-7 text-center">
              <Sparkles size={35} strokeWidth={1.2} className="mb-4 text-sage" />
              <h2 className="display-heading text-2xl text-forest">A story waiting to happen.</h2>
              <p className="mt-3 max-w-64 text-xs leading-6 text-muted">
                Choose a product and tell us what you want to share. Your editable campaign draft
                will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
