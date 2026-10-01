import sharp from 'sharp';

export const maxPosterBytes = 6 * 1024 * 1024;

export function validatePoster(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errors = {};
  const data = {};
  for (const [name, limit] of [
    ['headline', 90],
    ['callToAction', 80],
  ]) {
    if (typeof body[name] !== 'string' || !body[name].trim() || body[name].trim().length > limit)
      errors[name] = `Enter between 1 and ${limit} characters.`;
    else data[name] = body[name].trim();
  }
  if (typeof body.brandColor !== 'string' || !/^#[a-f\d]{6}$/i.test(body.brandColor))
    errors.brandColor = 'Choose a valid brand color.';
  else data.brandColor = body.brandColor;
  if (typeof body.image !== 'string' || !body.image.startsWith('data:image/png;base64,'))
    errors.image = 'Create a PNG poster before saving.';
  else {
    const encoded = body.image.slice('data:image/png;base64,'.length);
    if (
      !encoded.length ||
      encoded.length > Math.ceil(maxPosterBytes / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    )
      errors.image = 'The poster must be a PNG smaller than 6 MB.';
    else {
      const bytes = Buffer.from(encoded, 'base64');
      if (bytes.length > maxPosterBytes || bytes.toString('base64') !== encoded)
        errors.image = 'The poster must be a valid PNG smaller than 6 MB.';
      else data.bytes = bytes;
    }
  }
  return { data, errors };
}

export async function normalizePoster(bytes) {
  // Decode pixels, enforce our export size, and discard uploaded metadata.
  const image = sharp(bytes, { limitInputPixels: 1080 * 1080, animated: false });
  const metadata = await image.metadata();
  if (
    metadata.format !== 'png' ||
    metadata.width !== 1080 ||
    metadata.height !== 1080 ||
    (metadata.pages || 1) !== 1
  )
    throw new Error('Invalid poster dimensions.');
  const result = await image.png().toBuffer();
  if (result.length > maxPosterBytes) throw new Error('Poster is too large.');
  return result;
}

export function publicPoster(poster) {
  return {
    postIndex: poster.postIndex,
    headline: poster.headline,
    callToAction: poster.callToAction,
    brandColor: poster.brandColor,
    width: 1080,
    height: 1080,
    source: 'product-photo',
    updatedAt: poster.updatedAt,
  };
}
