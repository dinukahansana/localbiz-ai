import { useState } from 'react';
import FormField from './FormField.jsx';
import Modal from './Modal.jsx';
import { api } from '../lib/api.js';

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
  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFields((current) => ({ ...current, [name]: '' }));
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api(product ? `/products/${product.id}` : '/products', {
        method: product ? 'PUT' : 'POST',
        body: JSON.stringify(form),
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
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose} busy={busy}>
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
            Use a public image link. File uploads will come later.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary">
              {busy ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
