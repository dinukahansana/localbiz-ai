import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, Save } from 'lucide-react';
import FormField from './FormField.jsx';
import LoadState from './LoadState.jsx';
import AiPosterCard from './AiPosterCard.jsx';
import useResource from '../hooks/useResource.js';
import { api, apiUrl } from '../lib/api.js';
import { createPoster, readProductPhoto } from '../lib/posterCanvas.js';

function PhotoPosterCard({ campaign, post, index, savedPoster, onSaved }) {
  const [form, setForm] = useState({
    headline: savedPoster?.headline || post.angle.slice(0, 90),
    callToAction: savedPoster?.callToAction || post.callToAction.slice(0, 80),
    brandColor: savedPoster?.brandColor || '#245b46',
  });
  const [photoName, setPhotoName] = useState('');
  const photo = useRef(null);
  const photoVersion = useRef(0);
  const previewVersion = useRef(0);
  const [preview, setPreview] = useState('');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadingImage, setLoadingImage] = useState(Boolean(savedPoster));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const endpoint = `/campaign-posters/${campaign.id}/${index}`;

  useEffect(() => {
    const currentVersion = photoVersion;
    return () => {
      currentVersion.current++;
      if (photo.current) URL.revokeObjectURL(photo.current.url);
    };
  }, []);
  useEffect(() => {
    if (!savedPoster) return;
    let active = true;
    let url;
    const version = previewVersion.current;
    api(endpoint, { responseType: 'blob' }).then(
      (blob) => {
        if (!active) return;
        if (version === previewVersion.current) {
          url = URL.createObjectURL(blob);
          setPreview(url);
        }
        setLoadingImage(false);
      },
      (error) => {
        if (active) {
          setError(error.message);
          setLoadingImage(false);
        }
      },
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [endpoint, savedPoster]);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setSuccess('');
  }
  async function choosePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const version = ++photoVersion.current;
    setError('');
    setSuccess('');
    setPhotoName('');
    if (photo.current) URL.revokeObjectURL(photo.current.url);
    photo.current = null;
    try {
      const loaded = await readProductPhoto(file);
      if (version !== photoVersion.current) {
        URL.revokeObjectURL(loaded.url);
        return;
      }
      photo.current = loaded;
      setPhotoName(file.name);
    } catch (error) {
      if (version === photoVersion.current) {
        setError(error.message);
        event.target.value = '';
      }
    }
  }
  function build(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!photo.current) {
      setError('Choose a product photo first.');
      return;
    }
    try {
      const image = createPoster({
        ...form,
        photo: photo.current.image,
        businessName: campaign.businessName,
        productName: campaign.productName,
      });
      previewVersion.current++;
      setDraft({ ...form, image });
      setPreview(image);
    } catch (error) {
      setError(error.message);
    }
  }
  async function save() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api(endpoint, {
        method: 'PUT',
        body: JSON.stringify(draft),
        timeoutMs: 30000,
      });
      onSaved(result.poster);
      setDraft(null);
      setSuccess('Poster saved with this post.');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-2xl border border-line bg-white" open={index === 0}>
      <summary className="cursor-pointer px-5 py-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-forest">
        Post {index + 1} · {post.angle}
      </summary>
      <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-2">
        <form onSubmit={build} className="min-w-0 space-y-4">
          <div>
            <label htmlFor={`photo-${index}`} className="field-label">
              Product photo for post {index + 1}
            </label>
            <input
              id={`photo-${index}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={choosePhoto}
              disabled={busy}
              className="field mt-2 w-full text-xs"
            />
            <p className="mt-2 break-words text-xs leading-5 text-muted">
              {photoName ||
                'JPG, PNG, or WebP · up to 5 MB. The center of the photo will be cropped.'}
            </p>
          </div>
          <FormField
            name={`headline-${index}`}
            label="Poster headline"
            value={form.headline}
            onChange={(_, value) => change('headline', value)}
            required
            maxLength={90}
            disabled={busy}
          />
          <FormField
            name={`cta-${index}`}
            label="Poster call to action"
            value={form.callToAction}
            onChange={(_, value) => change('callToAction', value)}
            required
            maxLength={80}
            disabled={busy}
          />
          <div>
            <label htmlFor={`color-${index}`} className="field-label">
              Brand color
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id={`color-${index}`}
                type="color"
                value={form.brandColor}
                onChange={(event) => change('brandColor', event.target.value)}
                disabled={busy}
                className="h-10 w-14 cursor-pointer rounded border border-line bg-white p-1"
              />
              <span className="text-xs text-muted">{form.brandColor.toUpperCase()}</span>
            </div>
          </div>
          <button type="submit" className="button-secondary w-full" disabled={!photoName || busy}>
            <ImagePlus size={16} /> Create poster preview
          </button>
          <p className="text-xs leading-5 text-muted">
            Free photo template. Your original photo stays in this browser; only a poster you save
            is uploaded. Editing text or choosing another photo needs a new preview.
          </p>
        </form>
        <div className="min-w-0">
          {preview ? (
            <img
              src={preview}
              alt={`Promotional poster for ${campaign.productName}, post ${index + 1}`}
              className="aspect-square w-full rounded-xl border border-line object-contain"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line bg-canvas p-8 text-center text-sm text-muted">
              {loadingImage
                ? 'Loading saved poster…'
                : 'Your square poster preview will appear here.'}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={!draft || busy}
              className="button-primary"
            >
              {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
              {busy ? 'Saving…' : savedPoster ? 'Replace saved poster' : 'Save poster'}
            </button>
            {preview && (
              <a
                href={draft ? preview : apiUrl(`${endpoint}?download=1`)}
                download={`localbiz-post-${index + 1}.png`}
                className="button-secondary"
              >
                <Download size={15} /> Download PNG
              </a>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            1080 × 1080 pixels ·{' '}
            {draft
              ? 'Preview has not been saved.'
              : savedPoster
                ? 'Saved with this campaign post.'
                : 'Create a preview to save or download.'}{' '}
            Saving again replaces this post’s previous poster.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="mt-3 text-sm text-forest">
              {success}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

export default function PosterStudio({ campaign }) {
  const resource = useResource(`/campaign-posters/${campaign.id}`);
  const config = useResource('/poster-generations/config');
  const [mode, setMode] = useState('ai');
  function saved(poster) {
    resource.replace({
      posters: [
        ...resource.data.posters.filter((item) => item.postIndex !== poster.postIndex),
        poster,
      ],
    });
  }
  return (
    <section className="panel mt-6 p-5 sm:p-6" aria-labelledby="poster-heading">
      <div className="mb-5">
        <span className="badge">PROMOTION STUDIO</span>
        <h2 id="poster-heading" className="mt-3 text-xl font-semibold">
          Design your next promotion
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Create an AI-designed product scene and promotional poster from your campaign text and
          reference photo. Preview, save and download a square image ready for manual sharing. Saved
          posters stay private to your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Poster creation method">
          <button
            type="button"
            aria-pressed={mode === 'ai'}
            className={mode === 'ai' ? 'button-primary' : 'button-secondary'}
            onClick={() => setMode('ai')}
          >
            AI promotion poster
          </button>
          <button
            type="button"
            aria-pressed={mode === 'photo'}
            className={mode === 'photo' ? 'button-primary' : 'button-secondary'}
            onClick={() => setMode('photo')}
          >
            Free photo template
          </button>
        </div>
      </div>
      <LoadState resource={resource} label="posters" />
      {mode === 'ai' && <LoadState resource={config} label="AI poster setup" />}
      {resource.data && (
        <div className="space-y-4">
          {campaign.posts.map((post, index) => {
            const Card = mode === 'ai' ? AiPosterCard : PhotoPosterCard;
            return (
              <Card
                key={index}
                campaign={campaign}
                post={post}
                index={index}
                savedPoster={resource.data.posters.find((item) => item.postIndex === index)}
                onSaved={saved}
                config={config.data}
              />
            );
          })}
        </div>
      )}
      <p className="mt-5 text-xs leading-5 text-muted">
        Caption edits do not change an existing image. Create and save a replacement when needed. AI
        generation uses deAPI credits; the free photo template creates a layout in your browser.
      </p>
    </section>
  );
}
