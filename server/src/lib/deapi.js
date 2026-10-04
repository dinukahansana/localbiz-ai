import { env } from '../config/env.js';

export class ImageGenerationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const base = 'https://api.deapi.ai/api/v2';
export const editModel = 'QwenImageEdit_Plus_NF4';
export const textModel = 'Flux_2_Klein_4B_BF16';
// Completed native jobs return results.deapi.ai links. Match exact hosts, never all subdomains.
const resultHosts = new Set([
  'results.deapi.ai',
  'assets.deapi.ai',
  'api.deapi.ai',
  'media.deapi.ai',
]);

export function resultUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ImageGenerationError(502, 'deAPI returned an invalid image link.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !resultHosts.has(url.hostname)
  )
    throw new ImageGenerationError(
      502,
      'The image host was not recognized. Check the deAPI job in its dashboard; no new generation was started.',
    );
  return url;
}

// An injectable fetch keeps tests offline. There is no browser key or arbitrary provider URL.
export function createDeapiProvider({ key = env.deapiKey, fetchImpl = fetch } = {}) {
  async function request(path, options = {}) {
    if (!key)
      throw new ImageGenerationError(
        503,
        'AI posters need DEAPI_API_KEY on the backend. The free photo template is still available.',
      );
    try {
      const response = await fetchImpl(base + path, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'application/json', Authorization: `Bearer ${key}`, ...options.headers },
      });
      if (!response.ok) {
        if ([401, 403].includes(response.status))
          throw new ImageGenerationError(
            503,
            'Check the deAPI key, account status and model access on the backend.',
          );
        if ([402, 409].includes(response.status))
          throw new ImageGenerationError(
            503,
            'Check your available deAPI credits before generating again.',
          );
        if (response.status === 429)
          throw new ImageGenerationError(
            429,
            'deAPI is limiting requests. Wait before trying again.',
          );
        if (response.status === 422)
          throw new ImageGenerationError(
            422,
            'deAPI could not accept this request. Check credits and model access, or simplify the prompt.',
          );
        throw new ImageGenerationError(
          502,
          'deAPI is unavailable. Please try checking the current job again later.',
        );
      }
      return (await response.json()).data;
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error;
      throw new ImageGenerationError(
        504,
        'deAPI did not respond. Check the existing job before starting another generation.',
      );
    }
  }
  function parameters({ prompt, image }) {
    return image
      ? { model: editModel, prompt, steps: 20, seed: -1 }
      : { model: textModel, prompt, width: 1024, height: 1024, steps: 4, guidance: 1, seed: -1 };
  }
  return {
    configured: Boolean(key),
    async quote(input) {
      const data = await request(`/images/${input.image ? 'edits' : 'generations'}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameters(input)),
      });
      // Use native models with exact quotes; unavailable/estimated prices cannot guard spend.
      if (
        !data ||
        !Number.isFinite(data.price) ||
        data.price <= 0 ||
        data.is_estimated !== false ||
        data.estimate_basis === 'unavailable'
      )
        throw new ImageGenerationError(
          503,
          'An exact deAPI price is unavailable. No image generation was started.',
        );
      return data.price;
    },
    async start(input) {
      const params = parameters(input);
      let body;
      const headers = {};
      if (input.image) {
        body = new FormData();
        for (const [name, value] of Object.entries(params)) body.append(name, String(value));
        body.append(
          'image',
          new Blob([input.image], { type: 'image/png' }),
          'product-reference.png',
        );
      } else {
        body = JSON.stringify(params);
        headers['Content-Type'] = 'application/json';
      }
      const data = await request(`/images/${input.image ? 'edits' : 'generations'}`, {
        method: 'POST',
        headers,
        body,
      });
      if (typeof data?.request_id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(data.request_id))
        throw new ImageGenerationError(
          502,
          'deAPI did not return a job ID. Check its dashboard before generating again.',
        );
      return data.request_id;
    },
    async check(id) {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
        throw new ImageGenerationError(502, 'Invalid provider job ID.');
      const data = await request(`/jobs/${id}`);
      if (!['pending', 'processing', 'done', 'error'].includes(data?.status))
        throw new ImageGenerationError(
          502,
          'deAPI returned an unreadable job status. Check again later.',
        );
      return {
        status: data.status,
        progress: Number.isFinite(data.progress) ? Math.max(0, Math.min(100, data.progress)) : 0,
        url: data.status === 'done' ? data.result_url : undefined,
        message:
          data.status === 'error'
            ? `deAPI could not finish this image.${data.refunded === true ? ' Its charge was refunded.' : ' Check the job and credits in your deAPI dashboard.'}`
            : '',
      };
    },
    async download(value) {
      const url = resultUrl(value);
      try {
        // Never forward the provider key to asset storage, or follow redirects elsewhere.
        const response = await fetchImpl(url.href, {
          redirect: 'error',
          signal: AbortSignal.timeout(20000),
        });
        if (
          !response.ok ||
          !/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type') || '') ||
          Number(response.headers.get('content-length')) > 12 * 1024 * 1024
        )
          throw new Error('Invalid image response.');
        const reader = response.body.getReader();
        const chunks = [];
        let total = 0;
        try {
          while (true) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            total += chunk.length;
            if (total > 12 * 1024 * 1024) throw new Error('Image too large.');
            chunks.push(Buffer.from(chunk));
          }
        } finally {
          await reader.cancel();
        }
        return Buffer.concat(chunks);
      } catch {
        throw new ImageGenerationError(
          502,
          'The generated image could not be downloaded. Check this job again; no new generation was started.',
        );
      }
    },
  };
}
