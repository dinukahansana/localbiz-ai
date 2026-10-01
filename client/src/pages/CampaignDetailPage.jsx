import { useState } from 'react';
import { Link, useLocation, useOutletContext, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import LoadState from '../components/LoadState.jsx';
import CampaignEditor from '../components/CampaignEditor.jsx';
import useResource from '../hooks/useResource.js';
import { api } from '../lib/api.js';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const resource = useResource(`/campaigns/${id}`);
  const { campaigns } = useOutletContext();
  const { state } = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [success, setSuccess] = useState(state?.justSaved ? 'Campaign draft saved.' : '');
  const campaign = resource.data?.campaign;
  async function save(content) {
    setSaving(true);
    setError('');
    setFields({});
    setSuccess('');
    try {
      const result = await api(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(content),
      });
      resource.replace(result);
      campaigns.reload();
      setSuccess('Your changes are saved.');
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
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
        eyebrow="YOUR STORY, IN YOUR WORDS"
        title="Campaign draft"
        description="Refine your posts and copy the text when you’re ready to share."
      />
      <LoadState resource={resource} label="campaign" />
      {campaign && (
        <div className="grid items-start gap-6 xl:grid-cols-[.7fr_1.3fr]">
          <aside className="panel min-w-0 space-y-5 p-5 sm:p-6">
            <span className="badge">
              Draft · {campaign.platform === 'facebook' ? 'Facebook' : 'Instagram'}
            </span>
            <h2 className="break-words text-lg font-semibold">{campaign.title}</h2>
            <dl className="space-y-4 text-sm">
              {[
                ['Business', campaign.businessName],
                ['Product', campaign.productName],
                ['Goal', campaign.goal],
                ['Audience', campaign.audience],
                ['Tone', campaign.tone],
                ['Language', campaign.language],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="mb-1 text-xs text-muted">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words leading-6">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-5 text-muted">
              These are saved draft ideas. Scheduling and automatic publishing are coming in a later
              phase.
            </p>
          </aside>
          <section className="panel min-w-0 p-5 sm:p-6">
            {success && (
              <p role="status" className="mb-4 text-sm text-forest">
                {success}
              </p>
            )}
            <CampaignEditor
              key={`${id}-${campaign.updatedAt}`}
              draft={campaign}
              busy={saving}
              error={error}
              fields={fields}
              onSave={save}
              saved
            />
          </section>
        </div>
      )}
    </>
  );
}
