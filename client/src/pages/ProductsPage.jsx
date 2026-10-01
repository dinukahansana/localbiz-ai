import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import LoadState from '../components/LoadState.jsx';
import ProductForm from '../components/ProductForm.jsx';
import Modal from '../components/Modal.jsx';
import { api } from '../lib/api.js';

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="grid h-40 place-items-center overflow-hidden rounded-t-2xl bg-[#eef2e9] text-sage">
      {product.imageUrl && !failed ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package size={38} strokeWidth={1.2} />
      )}
    </div>
  );
}

function DeleteProduct({ product, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' });
      onDeleted(product.id);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Delete product?" onClose={onClose} busy={busy}>
      <p className="break-words text-sm leading-6">
        Delete <strong>{product.name}</strong> from your catalog? This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button className="button-secondary" disabled={busy} onClick={onClose} autoFocus>
          Cancel
        </button>
        <button
          className="button-primary bg-red-700 hover:bg-red-800"
          disabled={busy}
          onClick={remove}
        >
          {busy ? 'Deleting…' : 'Delete product'}
        </button>
      </div>
    </Modal>
  );
}

export default function ProductsPage() {
  const { products } = useOutletContext();
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [notice, setNotice] = useState('');
  const catalog = products.data?.products || [];
  function saved(product) {
    const exists = catalog.some((item) => item.id === product.id);
    const updated = exists
      ? catalog.map((item) => (item.id === product.id ? product : item))
      : [product, ...catalog];
    products.replace({ products: updated, total: updated.length });
    setEditor(null);
    setNotice(exists ? 'Product updated.' : 'Product added.');
  }
  function deleted(id) {
    const updated = catalog.filter((item) => item.id !== id);
    products.replace({ products: updated, total: updated.length });
    setDeleting(null);
    setNotice('Product deleted.');
  }
  return (
    <>
      <PageHeader
        eyebrow="YOUR BUSINESS, ON DISPLAY"
        title="Products"
        description="A home for the things you make, sell, and love."
      >
        <button
          className="button-primary"
          disabled={!products.data}
          onClick={() => {
            setNotice('');
            setEditor({});
          }}
        >
          <Plus size={16} />
          Add product
        </button>
      </PageHeader>
      {notice && (
        <p role="status" className="mb-5 rounded-xl bg-[#eef2e9] p-4 text-sm text-forest">
          {notice}
        </p>
      )}
      <LoadState resource={products} label="your catalog" />
      {products.data && (
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              Your catalog{' '}
              <span className="badge ml-2">
                {catalog.length} {catalog.length === 1 ? 'product' : 'products'}
              </span>
            </h2>
            <button className="text-xs font-medium text-forest underline" onClick={products.reload}>
              Refresh catalog
            </button>
          </div>
          {catalog.length === 0 ? (
            <div className="panel px-6 py-14 text-center">
              <Package size={34} className="mx-auto mb-4 text-sage" />
              <h3 className="font-semibold">Every great story starts with a product</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
                Add your first product with its name, price, and a few details.
              </p>
              <button className="button-primary mx-auto mt-6" onClick={() => setEditor({})}>
                Add your first product
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.map((product) => (
                <article key={product.id} className="panel flex min-w-0 flex-col overflow-hidden">
                  <ProductImage key={`${product.id}-${product.imageUrl}`} product={product} />
                  <div className="flex flex-1 flex-col p-5">
                    {product.category && (
                      <p className="mb-2 break-words text-xs text-muted">{product.category}</p>
                    )}
                    <h3 className="break-words font-semibold">{product.name}</h3>
                    <p className="mt-2 text-lg font-semibold text-forest">
                      {product.currency}{' '}
                      {Number(product.price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    {product.description && (
                      <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-muted">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-3 pt-5">
                      <button
                        className="button-secondary"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => {
                          setNotice('');
                          setEditor({ product });
                        }}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        className="icon-button text-red-700"
                        aria-label={`Delete ${product.name}`}
                        onClick={() => {
                          setNotice('');
                          setDeleting(product);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {editor && (
        <ProductForm product={editor.product} onClose={() => setEditor(null)} onSaved={saved} />
      )}
      {deleting && (
        <DeleteProduct product={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} />
      )}
    </>
  );
}
