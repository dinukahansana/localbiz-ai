import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../lib/api.js';

export default function DeleteCampaign({ campaign, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api(`/campaigns/${campaign.id}`, { method: 'DELETE' });
      onDeleted(campaign.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Delete campaign draft?" busy={busy} onClose={onClose}>
      <p className="break-words text-sm leading-6 text-muted">
        “{campaign.title}” and its three post ideas will be permanently removed.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button className="button-secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button className="button-primary !bg-red-700" disabled={busy} onClick={remove}>
          {busy ? 'Deleting…' : 'Delete draft'}
        </button>
      </div>
    </Modal>
  );
}
