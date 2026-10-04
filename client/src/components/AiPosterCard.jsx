import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle, Save, Sparkles, RefreshCw } from 'lucide-react';
import FormField from './FormField.jsx';
import { api, apiUrl } from '../lib/api.js';
import { readProductPhoto } from '../lib/posterCanvas.js';

const referenceInstruction =
  'If a reference photo is uploaded, use that exact product as the main subject. Preserve its shape, proportions, colors and visible details; change the setting and lighting to suit this promotion.';

function photoData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('This photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

export default function AiPosterCard({ campaign, post, index, savedPoster, onSaved, config }) {
  const [form, setForm] = useState({
    headline: savedPoster?.headline || post.angle.slice(0, 90),
    callToAction: savedPoster?.callToAction || post.callToAction.slice(0, 80),
    brandColor: savedPoster?.brandColor || '#245b46',
    style: 'studio',
    prompt:
      `${referenceInstruction}\n\nCreate a promotional poster for ${campaign.productName}.\nPost title: ${post.angle}\nPost caption: ${post.caption.slice(0, 1300)}\nVisual direction: ${post.imageIdea.slice(0, 400)}`.slice(
        0,
        2000,
      ),
  });
  const [photo, setPhoto] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [allowImagined, setAllowImagined] = useState(false);
  const [generation, setGeneration] = useState(null);
  const [preview, setPreview] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const [previewGenerationId, setPreviewGenerationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const requestKey = useRef(crypto.randomUUID());
  const imageVersion = useRef(0);
  const imageUrl = useRef('');
  const photoVersion = useRef(0);
  const photoInput = useRef(null);
  const endpoint = `/poster-generations/${campaign.id}/${index}`;
  const savedEndpoint = `/campaign-posters/${campaign.id}/${index}`;
  const waiting = generation && ['starting', 'pending', 'processing'].includes(generation.status);
  const generationId = generation?.id;
  const generationStatus = generation?.status;
  const savedGenerationId = savedPoster?.generationId;
  const disabled = busy || Boolean(waiting) || photoLoading;
  const previousModel = generation?.model || savedPoster?.model;
  const previousUsedReference = previousModel === 'QwenImageEdit_Plus_NF4';
  const needsReferenceAgain = previousUsedReference && !photo && !allowImagined;

  useEffect(() => {
    const version = imageVersion;
    const photoRequest = photoVersion;
    return () => {
      version.current++;
      photoRequest.current++;
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const version = ++imageVersion.current;
    async function load() {
      try {
        const result = await api(endpoint);
        if (!active) return;
        setGeneration(result.generation);
        if (result.generation?.settings?.prompt) setForm(result.generation.settings);
        if (savedPoster && result.generation?.status !== 'done') {
          const blob = await api(savedEndpoint, { responseType: 'blob' });
          if (!active || version !== imageVersion.current) return;
          if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
          imageUrl.current = URL.createObjectURL(blob);
          setPreview(imageUrl.current);
        }
      } catch (error) {
        if (active) setError(error.message);
      }
    }
    load();
    return () => {
      active = false;
    };
    // Reopening resumes a job; saving does not restart this initial lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, savedEndpoint]);

  useEffect(() => {
    if (!generationId || generationStatus !== 'done') return;
    let active = true;
    const version = ++imageVersion.current;
    api(`${endpoint}/${generationId}/image`, { responseType: 'blob' }).then(
      (blob) => {
        if (!active || version !== imageVersion.current) return;
        if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
        imageUrl.current = URL.createObjectURL(blob);
        setPreview(imageUrl.current);
        setUnsaved(savedGenerationId !== generationId);
        setPreviewGenerationId(generationId);
      },
      (error) => {
        if (active) setError(error.message);
      },
    );
    return () => {
      active = false;
    };
  }, [endpoint, generationId, generationStatus, savedGenerationId]);

  useEffect(() => {
    if (!waiting || !polling) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await api(`${endpoint}/${generation.id}`, { timeoutMs: 50000 });
        if (active) setGeneration(result.generation);
      } catch (error) {
        if (active) {
          setError(error.message);
          setPolling(false);
        }
      }
    }, 3000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [endpoint, generation, waiting, polling]);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setSuccess('');
  }
  async function choosePhoto(event) {
    const file = event.target.files[0];
    const version = ++photoVersion.current;
    setPhoto(null);
    setPhotoFailed(false);
    setAllowImagined(false);
    setError('');
    if (!file) {
      setPhotoLoading(false);
      return;
    }
    setPhotoLoading(true);
    try {
      const loaded = await readProductPhoto(file);
      URL.revokeObjectURL(loaded.url);
      const image = await photoData(file);
      if (version === photoVersion.current) setPhoto({ name: file.name, image });
    } catch (error) {
      if (version === photoVersion.current) {
        setPhotoFailed(true);
        setError(error.message);
      }
    } finally {
      if (version === photoVersion.current) setPhotoLoading(false);
    }
  }
  function removePhoto() {
    photoVersion.current++;
    if (photoInput.current) photoInput.current.value = '';
    setPhoto(null);
    setPhotoLoading(false);
    setPhotoFailed(false);
    setAllowImagined(false);
    setError('');
  }
  async function generate(event) {
    event.preventDefault();
    if (photoLoading || photoFailed) {
      setError('Wait for a valid reference photo, or remove it before generating a concept.');
      return;
    }
    if (needsReferenceAgain) {
      setError('Select your reference photo again, or choose to generate an imagined concept.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api(endpoint, {
        method: 'POST',
        timeoutMs: 50000,
        body: JSON.stringify({
          ...form,
          image: photo?.image || '',
          requestKey: requestKey.current,
        }),
      });
      setGeneration(result.generation);
      setPolling(true);
      // Only a confirmed reply gets a new key. A lost reply can safely be retried.
      requestKey.current = crypto.randomUUID();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function checkAgain() {
    setBusy(true);
    setError('');
    try {
      const current = await api(endpoint);
      const result = current.generation
        ? await api(`${endpoint}/${current.generation.id}`, { timeoutMs: 50000 })
        : current;
      setGeneration(result.generation);
      setPolling(true);
      if (!result.generation)
        setSuccess('No existing job was found. You can submit the same request safely.');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await api(savedEndpoint, {
        method: 'PUT',
        body: JSON.stringify({ generationId: previewGenerationId }),
      });
      onSaved(result.poster);
      setUnsaved(false);
      setSuccess('AI poster saved with this post.');
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
        <form onSubmit={generate} className="min-w-0 space-y-4">
          <div>
            <label htmlFor={`ai-photo-${index}`} className="field-label">
              Reference product photo
            </label>
            <input
              ref={photoInput}
              id={`ai-photo-${index}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={choosePhoto}
              disabled={disabled}
              className="field mt-2 w-full text-xs"
            />
            <p className="mt-2 break-words text-xs leading-5 text-muted">
              {photo?.name ||
                'JPG, PNG, or WebP · up to 5 MB. Add a photo so AI can reference your actual product. Without one, it creates an imagined product concept.'}
            </p>
            {photoLoading ? (
              <p role="status" className="mt-2 text-xs text-forest">
                Preparing your reference photo…
              </p>
            ) : photo ? (
              <p role="status" className="mt-2 text-xs leading-5 text-forest">
                Reference photo ready. This product will guide your next AI image.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-amber-800">
                {previousUsedReference
                  ? 'Your previous image used a reference photo. Select it again before generating another; uploads clear when you refresh.'
                  : 'No reference selected for the next image. Choose your product photo for editing; otherwise AI will imagine its appearance.'}
              </p>
            )}
            {(photo || photoFailed) && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={disabled}
                className="mt-2 text-xs font-semibold text-forest underline"
              >
                Remove reference photo
              </button>
            )}
            {previousUsedReference && !photo && !photoLoading && (
              <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
                <input
                  type="checkbox"
                  checked={allowImagined}
                  onChange={(event) => setAllowImagined(event.target.checked)}
                  disabled={disabled}
                  className="mt-1 accent-forest"
                />
                Generate an imagined concept without the previous photo
              </label>
            )}
          </div>
          <FormField
            name={`ai-style-${index}`}
            label="Design style"
            value={form.style}
            onChange={(_, value) => change('style', value)}
            disabled={disabled}
          >
            <option value="studio">Premium studio</option>
            <option value="lifestyle">Warm lifestyle</option>
            <option value="bold">Bold promotion</option>
          </FormField>
          <FormField
            name={`ai-prompt-${index}`}
            label="Creative prompt"
            value={form.prompt}
            onChange={(_, value) => change('prompt', value)}
            multiline
            required
            maxLength={2000}
            disabled={disabled}
          />
          <p className="text-xs leading-5 text-muted">
            Starts from this post’s title, caption and visual idea. Describe the scene, mood, props
            and layout you want. We always tell AI to preserve an uploaded reference product and
            make it the main subject, even when you edit this prompt.
          </p>
          <FormField
            name={`ai-headline-${index}`}
            label="Headline in the image"
            value={form.headline}
            onChange={(_, value) => change('headline', value)}
            required
            maxLength={90}
            disabled={disabled}
          />
          <FormField
            name={`ai-cta-${index}`}
            label="Call to action in the image"
            value={form.callToAction}
            onChange={(_, value) => change('callToAction', value)}
            required
            maxLength={80}
            disabled={disabled}
          />
          <div>
            <label htmlFor={`ai-color-${index}`} className="field-label">
              Brand accent color
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id={`ai-color-${index}`}
                type="color"
                value={form.brandColor}
                onChange={(event) => change('brandColor', event.target.value)}
                disabled={disabled}
                className="h-10 w-14 cursor-pointer rounded border border-line bg-white p-1"
              />
              <span className="text-xs text-muted">{form.brandColor.toUpperCase()}</span>
            </div>
          </div>
          <button
            type="submit"
            className="button-primary w-full"
            disabled={disabled || photoFailed || needsReferenceAgain || !config?.configured}
          >
            {disabled ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {waiting
              ? 'AI is designing your poster…'
              : photoLoading
                ? 'Preparing reference photo…'
                : busy
                  ? 'Please wait…'
                  : generation
                    ? 'Generate another AI poster'
                    : 'Generate AI poster'}
          </button>
          <p className="text-xs leading-5 text-muted">
            {config?.configured
              ? `Uses deAPI credits · exact quote must be at most ${config.maxPrice} credits · five submissions per account per UTC hour. The app shares a ${config.dailyLimit}-image daily limit. Every new generation uses credits.`
              : 'AI image generation needs a deAPI key on the backend. You can use the free photo template while it is being set up.'}
          </p>
          <p className="text-xs leading-5 text-muted">
            Generating sends this product photo, public product details and campaign text to deAPI.
            The original photo is not stored in your account. Editing fields needs a new generation.
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
              <div>
                <Sparkles size={30} className="mx-auto mb-3 text-forest" />
                Your AI-designed promotion will appear here.
              </div>
            </div>
          )}
          {waiting && (
            <p role="status" className="mt-4 text-sm text-forest">
              {generation.status === 'starting'
                ? 'Submitting your design…'
                : 'Designing your product scene and poster…'}{' '}
              {generation.progress > 0
                ? `${Math.round(generation.progress)}%`
                : 'You can reopen this campaign to check it.'}
            </p>
          )}
          {generation?.message && (
            <p role="status" className="mt-3 text-sm text-amber-800">
              {generation.message}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={!unsaved || !previewGenerationId || busy || Boolean(waiting)}
              className="button-primary"
            >
              <Save size={15} />
              {savedPoster ? 'Replace saved poster' : 'Save AI poster'}
            </button>
            {preview && (
              <a
                href={unsaved ? preview : apiUrl(`${savedEndpoint}?download=1`)}
                download={`localbiz-ai-post-${index + 1}.png`}
                className="button-secondary"
              >
                <Download size={15} />
                Download PNG
              </a>
            )}
            {(error || waiting || generation?.status === 'unknown') && (
              <button
                type="button"
                onClick={checkAgain}
                disabled={busy}
                className="button-secondary"
              >
                <RefreshCw size={15} />
                Check current job
              </button>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            1080 × 1080 PNG ·{' '}
            {unsaved
              ? 'Preview is not saved; it expires after 48 hours.'
              : savedPoster
                ? `Saved ${savedPoster.source === 'deapi' ? 'AI' : 'photo'} poster.`
                : 'Generate a preview, then save or download.'}{' '}
            Saving replaces this post’s previous poster.
          </p>
          {previousModel && (
            <p className="mt-2 text-xs leading-5 text-muted">
              {previousUsedReference
                ? 'This job used reference-photo editing. The original upload is not stored.'
                : 'This job was generated without a reference photo.'}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-muted">
            Review product shape, packaging, spelling and claims before sharing. AI may redraw
            details and text. Download the image and copy your caption to post on Facebook or
            Instagram yourself.
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
