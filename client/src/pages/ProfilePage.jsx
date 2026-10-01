import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Store } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import LoadState from '../components/LoadState.jsx';
import FormField from '../components/FormField.jsx';
import { api } from '../lib/api.js';

const emptyProfile = { name: '', category: '', location: '', story: '' };

function ProfileForm({ profile, onSaved }) {
  const [form, setForm] = useState(profile || emptyProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [saved, setSaved] = useState(false);
  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFields((current) => ({ ...current, [name]: '' }));
    setSaved(false);
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    setSaved(false);
    try {
      const data = await api('/business-profile', { method: 'PUT', body: JSON.stringify(form) });
      setForm(data.profile);
      onSaved(data);
      setSaved(true);
    } catch (failure) {
      setError(failure.message);
      setFields(failure.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="panel p-6">
      <h2 className="mb-6 font-semibold">Your business details</h2>
      <p className="mb-5 text-xs text-muted">Business name and category are required.</p>
      <fieldset disabled={busy} className="space-y-5">
        <legend className="sr-only">Business details</legend>
        <FormField
          name="name"
          label="Business name"
          value={form.name}
          onChange={change}
          error={fields.name}
          required
          maxLength={100}
          autoComplete="organization"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            name="category"
            label="Category"
            value={form.category}
            onChange={change}
            error={fields.category}
            required
            maxLength={60}
            placeholder="e.g. Bakery"
          />
          <FormField
            name="location"
            label="Location"
            value={form.location}
            onChange={change}
            error={fields.location}
            maxLength={160}
            placeholder="Your town or city"
          />
        </div>
        <FormField
          name="story"
          label="Your story"
          value={form.story}
          onChange={change}
          error={fields.story}
          multiline
          maxLength={2000}
          placeholder="What makes your business special?"
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-forest">
            Business profile saved.
          </p>
        )}
        <button className="button-primary" type="submit">
          {busy ? 'Saving…' : 'Save business profile'}
        </button>
      </fieldset>
    </form>
  );
}

export default function ProfilePage() {
  const { profile } = useOutletContext();
  return (
    <>
      <PageHeader
        eyebrow="THE PEOPLE BEHIND THE PRODUCTS"
        title="Business profile"
        description="Tell your business story and keep your details in one place."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div>
          <LoadState resource={profile} label="your business profile" />
          {profile.data && <ProfileForm profile={profile.data.profile} onSaved={profile.replace} />}
        </div>
        <div className="rounded-2xl bg-forest p-7 text-white">
          <Store className="mb-5 text-lime" size={28} />
          <h2 className="display-heading text-3xl leading-tight">
            A business with
            <br />a little more you.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#c4d4cc]">
            Your voice, your neighborhood, your special something. These details will help shape
            future campaigns.
          </p>
        </div>
      </div>
    </>
  );
}
