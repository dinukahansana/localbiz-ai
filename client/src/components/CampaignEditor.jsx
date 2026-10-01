import { useState } from 'react';
import { Copy, Save } from 'lucide-react';
import FormField from './FormField.jsx';

export default function CampaignEditor({ draft, busy, error, fields = {}, onSave, saved }) {
  const [form, setForm] = useState(() => ({
    title: draft.title,
    posts: draft.posts.map((post) => ({ ...post, hashtags: post.hashtags.join(' ') })),
  }));
  const [copyStatus, setCopyStatus] = useState('');
  const [edited, setEdited] = useState(false);
  function changeTitle(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setEdited(true);
  }
  function changePost(index, name, value) {
    setForm((current) => ({
      ...current,
      posts: current.posts.map((post, postIndex) =>
        postIndex === index ? { ...post, [name]: value } : post,
      ),
    }));
    setEdited(true);
  }
  async function copyPost(index) {
    const post = form.posts[index];
    try {
      await navigator.clipboard.writeText(
        `${post.caption}\n\n${post.callToAction}\n\n${post.hashtags}`,
      );
      setCopyStatus(`Post ${index + 1} copied.`);
    } catch {
      setCopyStatus(
        'Copy is unavailable in this browser. Select the caption and hashtags to copy them manually.',
      );
    }
  }
  function submit(event) {
    event.preventDefault();
    onSave({
      title: form.title,
      posts: form.posts.map((post) => ({
        ...post,
        hashtags: post.hashtags.trim().split(/\s+/).filter(Boolean),
      })),
    });
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Make it yours</h2>
        <span className="badge">{edited || !saved ? 'Unsaved changes' : 'Saved draft'}</span>
      </div>
      <p className="text-xs leading-5 text-muted">
        Review the wording, prices, and claims before sharing. Save your changes before leaving this
        page.
      </p>
      {copyStatus && (
        <p role="status" className="text-xs text-forest">
          {copyStatus}
        </p>
      )}
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">Edit campaign draft</legend>
        <FormField
          name="title"
          label="Campaign title"
          value={form.title}
          onChange={changeTitle}
          error={fields.title}
          required
          maxLength={100}
        />
        {form.posts.map((post, index) => (
          <section
            key={index}
            className="min-w-0 space-y-4 rounded-xl border border-line bg-canvas/50 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Post idea {index + 1}</h3>
              <button
                type="button"
                className="button-secondary !min-h-9 !px-3 !py-2 !text-xs"
                onClick={() => copyPost(index)}
                aria-label={`Copy post ${index + 1}`}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
            {[
              { name: 'angle', label: 'Post angle', maxLength: 80 },
              { name: 'caption', label: 'Caption', maxLength: 2200, multiline: true },
              { name: 'callToAction', label: 'Call to action', maxLength: 200 },
              { name: 'hashtags', label: 'Hashtags (separate with spaces)', maxLength: 731 },
              { name: 'imageIdea', label: 'Photo idea', maxLength: 600, multiline: true },
            ].map(({ name, label, ...props }) => (
              <FormField
                key={name}
                name={`post-${index}-${name}`}
                label={`${label} · Post ${index + 1}`}
                value={post[name]}
                onChange={(_field, value) => changePost(index, name, value)}
                error={fields[`posts.${index}.${name}`]}
                required
                {...props}
              />
            ))}
          </section>
        ))}
        {(error || fields.form || fields.posts) && (
          <p role="alert" className="text-sm text-red-700">
            {error || fields.form || fields.posts}
          </p>
        )}
        <button className="button-primary w-full" type="submit">
          <Save size={16} />
          {busy ? 'Saving draft…' : saved ? 'Save changes' : 'Save campaign draft'}
        </button>
      </fieldset>
    </form>
  );
}
