import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { CalendarPlus } from 'lucide-react';
import Modal from './Modal.jsx';
import FormField from './FormField.jsx';
import { api } from '../lib/api.js';
import { postingInput, postingTimeLabel, scheduledInstant } from '../lib/scheduleDates.js';

export default function ScheduleForm({ campaignId, postIndex = 0, schedule, onClose, onSaved }) {
  const { campaigns, schedules } = useOutletContext();
  const list = campaigns.data?.campaigns || [];
  const records = schedules.data?.schedules || [];
  const [selectedCampaign, setSelectedCampaign] = useState(
    schedule?.campaignId || campaignId || list[0]?.id || '',
  );
  const [selectedPost, setSelectedPost] = useState(String(schedule?.postIndex ?? postIndex));
  const [date, setDate] = useState(() =>
    schedule
      ? postingInput(schedule.scheduledFor)
      : `${postingInput(Date.now() + 86400000).slice(0, 10)}T09:00`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const campaign = list.find((item) => item.id === selectedCampaign);
  const existing = records.find(
    (item) => item.campaignId === selectedCampaign && item.postIndex === Number(selectedPost),
  );
  const locked = Boolean(schedule || campaignId);
  const available =
    Boolean(campaign) && (!existing || existing.status === 'cancelled' || Boolean(schedule));
  const [bounds] = useState(() => {
    const now = Date.now();
    const latest = new Date(now);
    latest.setUTCFullYear(latest.getUTCFullYear() + 2);
    return {
      min: postingInput(Math.ceil((now + 60000) / 60000) * 60000),
      max: postingInput(latest),
    };
  });
  async function save(event) {
    event.preventDefault();
    // Read the visible native picker value, including browser autofill.
    const selectedDate = new FormData(event.currentTarget).get('schedule-date');
    setDate(selectedDate);
    setBusy(true);
    setError('');
    setFields({});
    try {
      const scheduledFor = scheduledInstant(selectedDate);
      const record = schedule || (existing?.status === 'cancelled' ? existing : null);
      await api(record ? `/schedules/${record.id}` : '/schedules', {
        method: record ? 'PUT' : 'POST',
        body: JSON.stringify(
          record
            ? { scheduledFor }
            : {
                campaignId: selectedCampaign,
                postIndex: Number(selectedPost),
                scheduledFor,
              },
        ),
      });
      onSaved();
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={schedule ? 'Reschedule this post' : 'Plan a post'} onClose={onClose} busy={busy}>
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          <legend className="sr-only">Posting plan</legend>
          <FormField
            name="schedule-campaign"
            label="Saved campaign"
            value={selectedCampaign}
            onChange={(_, value) => {
              setSelectedCampaign(value);
              setSelectedPost('0');
            }}
            required
            disabled={locked}
          >
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </FormField>
          <FormField
            name="schedule-post"
            label="Campaign post"
            value={selectedPost}
            onChange={(_, value) => setSelectedPost(value)}
            required
            disabled={locked}
          >
            {campaign?.posts.map((post, index) => (
              <option key={index} value={index}>
                Post {index + 1} · {post.angle}
              </option>
            ))}
          </FormField>
          <FormField
            name="schedule-date"
            label="Posting date and time (Sri Lanka)"
            type="datetime-local"
            value={date}
            onChange={(_, value) => setDate(value)}
            required
            min={bounds.min}
            max={bounds.max}
            error={fields.scheduledFor}
          />
          <p className="text-xs leading-5 text-muted">
            {postingTimeLabel}. Choose a future time. You’ll share the post yourself and then mark
            it as published. The plan uses your latest saved caption and poster.
          </p>
          {!available && (
            <p className="text-sm text-muted">
              This post already has a plan. Choose another post or manage the existing plan in the
              calendar.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={!available}>
              <CalendarPlus size={16} /> {busy ? 'Saving…' : 'Save posting plan'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
