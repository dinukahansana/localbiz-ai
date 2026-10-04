import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const maxUploadBytes = 5 * 1024 * 1024;
const maxStoredBytes = 2 * 1024 * 1024;

// Omitted means keep the photo; null removes it; a data URL replaces it.
export async function productPhotoChanges(photo) {
  if (photo === undefined) return {};
  if (photo === null) return { photoData: null, photoVersion: '' };
  const match =
    typeof photo === 'string' &&
    photo.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > Math.ceil(maxUploadBytes / 3) * 4)
    throw new Error('Choose a JPG, PNG, or WebP photo up to 5 MB.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > maxUploadBytes || bytes.toString('base64') !== match[2])
    throw new Error('Choose a valid product photo up to 5 MB.');
  let photoData;
  try {
    const image = sharp(bytes, { limitInputPixels: 20000000, animated: false });
    const info = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(info.format) || (info.pages || 1) !== 1)
      throw new Error('Unsupported photo.');
    // Preserve the whole product, correct orientation and strip camera/GPS metadata.
    photoData = await image
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    throw new Error('Choose a valid, still JPG, PNG, or WebP under 20 million pixels.');
  }
  if (photoData.length > maxStoredBytes)
    throw new Error('This photo is too detailed to save. Choose a smaller photo.');
  return { photoData, photoVersion: randomUUID() };
}
