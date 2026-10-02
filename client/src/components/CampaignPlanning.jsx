import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { CalendarPlus } from 'lucide-react';
import LoadState from './LoadState.jsx';
import ScheduleForm from './ScheduleForm.jsx';
import ScheduleActions from './ScheduleActions.jsx';
import { formatPostingTime, postingTimeLabel } from '../lib/scheduleDates.js';

export default function CampaignPlanning({ campaign }) {
  const { campaigns, schedules } = useOutletContext();
  const [editing, setEditing] = useState(null);
  const [success, setSuccess] = useState('');
  const records = schedules.data?.schedules || [];
  function changed(message) {
    setSuccess(message);
    schedules.reload();
  }
  return (
    <section className="panel mt-6 p-5 sm:p-6" aria-labelledby="planning-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="badge">YOUR POSTING PLAN</span>
          <h2 id="planning-heading" className="mt-3 text-xl font-semibold">
            Plan your posting dates
          </h2>
          <p className="mt-2 text-sm text-muted">
            {postingTimeLabel}. Plan a date, share manually, then mark it as published.
          </p>
        </div>
        <Link to="/dashboard/calendar" className="button-secondary">
          Open calendar
        </Link>
      </div>
      {success && (
        <p role="status" className="mb-4 text-sm text-forest">
          {success}
        </p>
      )}
      <LoadState resource={schedules} label="posting plans" />
      {schedules.data && (
        <div className="grid gap-4 xl:grid-cols-3">
          {campaign.posts.map((post, index) => {
            const schedule = records.find(
              (item) => item.campaignId === campaign.id && item.postIndex === index,
            );
            return (
              <article
                key={index}
                className="min-w-0 space-y-4 rounded-xl border border-line bg-canvas/50 p-4"
              >
                <h3 className="break-words text-sm font-semibold">
                  Post {index + 1} · {post.angle}
                </h3>
                {schedule ? (
                  <>
                    <span className="badge">
                      {schedule.status === 'scheduled'
                        ? 'Planned'
                        : schedule.status === 'published'
                          ? 'Published · manual'
                          : 'Cancelled'}
                    </span>
                    <p className="text-sm">{formatPostingTime(schedule.scheduledFor)}</p>
                    {schedule.publishedAt && (
                      <p className="text-xs text-muted">
                        Marked published: {formatPostingTime(schedule.publishedAt)}
                      </p>
                    )}
                    <ScheduleActions
                      schedule={schedule}
                      onReschedule={() => setEditing({ index, schedule })}
                      onChanged={changed}
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted">No posting date planned yet.</p>
                    <button
                      className="button-secondary !text-xs"
                      disabled={campaigns.loading || Boolean(campaigns.error)}
                      onClick={() => setEditing({ index, schedule: null })}
                    >
                      <CalendarPlus size={14} /> Plan post {index + 1}
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
      {editing && (
        <ScheduleForm
          campaignId={campaign.id}
          postIndex={editing.index}
          schedule={editing.schedule}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            changed('Posting plan saved.');
          }}
        />
      )}
    </section>
  );
}
