import { useState } from 'react';
import { Check, Copy, CalendarDays, X } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ScheduleActions({ schedule, onReschedule, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function changeStatus(status) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/schedules/${schedule.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onChanged(
        status === 'published'
          ? 'Post marked as published.'
          : 'Posting plan cancelled. You can plan it again.',
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(
        `${schedule.caption}\n\n${schedule.callToAction}\n\n${schedule.hashtags.join(' ')}`,
      );
      setMessage('Post text copied.');
    } catch {
      setError('Copy is unavailable. Open the campaign and select the text manually.');
    }
  }
  const buttonClass = 'button-secondary !min-h-9 !px-3 !py-2 !text-xs';
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass} onClick={copy} disabled={busy}>
          <Copy size={13} /> Copy text
        </button>
        {schedule.status !== 'published' && (
          <button className={buttonClass} onClick={onReschedule} disabled={busy}>
            <CalendarDays size={13} />{' '}
            {schedule.status === 'cancelled' ? 'Plan again' : 'Reschedule'}
          </button>
        )}
        {schedule.status === 'scheduled' && (
          <>
            <button
              className={buttonClass}
              onClick={() => changeStatus('published')}
              disabled={busy}
            >
              <Check size={13} /> Mark as published
            </button>
            <button
              className={buttonClass}
              onClick={() => changeStatus('cancelled')}
              disabled={busy}
            >
              <X size={13} /> Cancel plan
            </button>
          </>
        )}
      </div>
      {message && (
        <p role="status" className="mt-3 text-xs text-forest">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
