import { useEffect, useRef, useState } from 'react';
import FormField from './FormField.jsx';
import Modal from './Modal.jsx';
import { api } from '../lib/api.js';
import useProductPhoto from '../hooks/useProductPhoto.js';
import { readPhotoUpload } from '../lib/productPhotos.js';

const emptyProduct = {
  name: '',
  category: '',
  description: '',
  price: '',
  currency: 'LKR',
  imageUrl: '',
};
const currencies = ['LKR', 'USD', 'EUR', 'GBP', 'INR'];

export default function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(product || emptyProduct);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [photo, setPhoto] = useState(undefined);
  const [photoName, setPhotoName] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const savedPhoto = useProductPhoto(product);
  const photoInput = useRef(null);
  const photoVersion = useRef(0);
  const preview = photo === undefined ? savedPhoto.url : photo || '';
  useEffect(() => {
    const version = photoVersion;
    return () => {
      version.current++;
    };
  }, []);
  async function choosePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const version = ++photoVersion.current;
    setPhotoLoading(true);
    setPhotoFailed(false);
    setFields((current) => ({ ...current, photo: '' }));
    try {
      const loaded = await readPhotoUpload(file);
      if (version !== photoVersion.current) return;
      setPhoto(loaded.image);
      setPhotoName(loaded.name);
      change('imageUrl', '');
    } catch (error) {
      if (version === photoVersion.current) {
        setPhotoFailed(true);
        setFields((current) => ({ ...current, photo: error.message }));
      }
    } finally {
      if (version === photoVersion.current) setPhotoLoading(false);
    }
  }
  function removePhoto() {
    photoVersion.current++;
    if (photoInput.current) photoInput.current.value = '';
    setPhoto(null);
    setPhotoName('');
    setPhotoLoading(false);
    setPhotoFailed(false);
    setFields((current) => ({ ...current, photo: '' }));
  }
  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFields((current) => ({ ...current, [name]: '' }));
  }
  async function save(event) {
    event.preventDefault();
    if (photoLoading || photoFailed) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api(product ? `/products/${product.id}` : '/products', {
        method: product ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, photo }),
        timeoutMs: 60000,
      });
      onSaved(data.product);
    } catch (failure) {
      setError(failure.message);
      setFields(failure.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={product ? 'Edit product' : 'Add product'}
      onClose={onClose}
      busy={busy || photoLoading}
    >
      <form onSubmit={save}>
        <fieldset disabled={busy} className="space-y-5">
          <legend className="sr-only">Product details</legend>
          <FormField
            name="name"
            label="Product name"
            value={form.name}
            onChange={change}
            error={fields.name}
            required
            maxLength={100}
            autoFocus
          />
          <FormField
            name="category"
            label="Category (optional)"
            value={form.category}
            onChange={change}
            error={fields.category}
            maxLength={60}
            placeholder="e.g. Baked goods"
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="price"
              label="Price"
              value={form.price}
              onChange={change}
              error={fields.price}
              type="number"
              min="0"
              max="9999999.99"
              step="0.01"
              required
            />
            <FormField
              name="currency"
              label="Currency"
              value={form.currency}
              onChange={change}
              error={fields.currency}
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </FormField>
          </div>
          <FormField
            name="description"
            label="Description (optional)"
            value={form.description}
            onChange={change}
            error={fields.description}
            multiline
            maxLength={2000}
          />
          <div>
            <label htmlFor="product-photo" className="field-label">
              Product photo (optional)
            </label>
            <input
              ref={photoInput}
              id="product-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={choosePhoto}
              aria-invalid={Boolean(fields.photo)}
              aria-describedby="product-photo-help"
              className="field mt-2 w-full text-xs"
            />
            <p id="product-photo-help" className="mt-2 text-xs leading-5 text-muted">
              JPG, PNG, or WebP · up to 5 MB and 20 million pixels. One photo per product, saved
              privately with your account. You can reuse it for AI posters.
            </p>
            {preview && (
              <img
                src={preview}
                alt="Product photo preview"
                className="mt-3 h-40 w-full rounded-xl border border-line bg-canvas object-contain"
              />
            )}
            {photoLoading && (
              <p role="status" className="mt-2 text-xs text-forest">
                Preparing photo…
              </p>
            )}
            {photoName && <p className="mt-2 break-words text-xs text-muted">{photoName}</p>}
            {photo === null && product?.hasPhoto && (
              <p className="mt-2 text-xs text-muted">Photo will be removed when you save.</p>
            )}
            {fields.photo && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {fields.photo}
              </p>
            )}
            {photo === undefined && savedPhoto.error && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                {savedPhoto.error}
              </p>
            )}
            {(preview || photoFailed || (photo === undefined && product?.hasPhoto)) && (
              <button
                type="button"
                onClick={removePhoto}
                className="mt-2 text-xs font-semibold text-forest underline"
              >
                Remove photo
              </button>
            )}
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-forest">
              Use an image link instead (optional)
            </summary>
            <div className="mt-3">
              <FormField
                name="imageUrl"
                label="Image URL (optional)"
                value={form.imageUrl}
                onChange={change}
                error={fields.imageUrl}
                type="url"
                maxLength={2048}
                placeholder="https://…"
              />
              <p className="text-xs leading-5 text-muted">
                Paste a direct public photo link. Links only display on your product card; they are
                not saved as photos or sent to AI. An uploaded photo takes priority.
              </p>
            </div>
          </details>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={photoLoading || photoFailed}>
              {busy ? 'Saving…' : photoLoading ? 'Preparing photo…' : 'Save product'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
