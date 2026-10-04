import { readProductPhoto } from './posterCanvas.js';

export function photoData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('This photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

export async function readPhotoUpload(file) {
  const loaded = await readProductPhoto(file);
  try {
    return { name: file.name, image: await photoData(file) };
  } finally {
    URL.revokeObjectURL(loaded.url);
  }
}
