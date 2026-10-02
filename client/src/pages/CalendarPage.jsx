import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import LoadState from '../components/LoadState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ScheduleForm from '../components/ScheduleForm.jsx';
import ScheduleActions from '../components/ScheduleActions.jsx';
import {
  formatPostingTime,
  postingDateKey,
  postingTimeLabel,
  postingTimeZone,
} from '../lib/scheduleDates.js';

const statusLabels = {
  scheduled: 'Planned',
  published: 'Published · manual',
  cancelled: 'Cancelled',
};

export default function CalendarPage() {
  const { campaigns, schedules } = useOutletContext();
  const [now, setNow] = useState(() => Date.now());
  const today = postingDateKey(now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState(null);
  const [success, setSuccess] = useState('');
  const [year, monthNumber] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthTitle = monthStart.toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const startDay = (monthStart.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cellCount = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const monthPlans = (schedules.data?.schedules || []).filter(
    (item) =>
      postingDateKey(item.scheduledFor).startsWith(month) &&
      (filter === 'active' ? item.status !== 'cancelled' : item.status === filter),
  );
  const visiblePlans = selectedDay
    ? monthPlans.filter((item) => postingDateKey(item.scheduledFor) === selectedDay)
    : monthPlans;

  function moveMonth(amount) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
    setMonth(next.toISOString().slice(0, 7));
    setSelectedDay(null);
  }
  function changed(message) {
    setSuccess(message);
    schedules.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="A LITTLE ROOM TO PLAN"
        title="Content calendar"
        description="Plan your dates and track the posts you share yourself."
      >
        <button
          className="button-primary"
          onClick={() => setEditing({ schedule: null })}
          disabled={!campaigns.data?.total || schedules.loading || Boolean(schedules.error)}
        >
          <CalendarPlus size={16} /> Plan a post
        </button>
      </PageHeader>
      <p className="mb-5 text-xs leading-5 text-muted">
        {postingTimeLabel}. Dates are saved to your account. Share posts manually and mark them as
        published here.
      </p>
      {success && (
        <p role="status" className="mb-4 text-sm text-forest">
          {success}
        </p>
      )}
      <LoadState resource={schedules} label="posting plans" />
      {campaigns.error && <LoadState resource={campaigns} label="campaigns" />}
      <section className="panel mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <h2 className="text-lg font-semibold" aria-live="polite">
            {monthTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="button-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
              onClick={() => {
                setMonth(today.slice(0, 7));
                setSelectedDay(today);
              }}
            >
              Today
            </button>
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button className="icon-button" aria-label="Next month" onClick={() => moveMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div role="table" aria-label={`Content calendar for ${monthTitle}`}>
          <div role="row" className="grid grid-cols-7 border-b border-line bg-canvas/60">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                role="columnheader"
                key={day}
                className="py-3 text-center text-[10px] font-medium uppercase tracking-wide text-muted"
              >
                {day}
              </div>
            ))}
          </div>
          {Array.from({ length: cellCount / 7 }, (_, week) => (
            <div role="row" className="grid grid-cols-7" key={week}>
              {Array.from({ length: 7 }, (_, weekday) => {
                const day = week * 7 + weekday - startDay + 1;
                const inMonth = day > 0 && day <= daysInMonth;
                const key = `${month}-${String(day).padStart(2, '0')}`;
                const entries = inMonth
                  ? monthPlans.filter((item) => postingDateKey(item.scheduledFor) === key)
                  : [];
                return (
                  <div
                    role="cell"
                    key={weekday}
                    className={`min-w-0 border-b border-r border-line last:border-r-0 ${inMonth ? 'bg-white' : 'bg-canvas/60'}`}
                  >
                    {inMonth ? (
                      <button
                        onClick={() => setSelectedDay(key)}
                        aria-pressed={selectedDay === key}
                        aria-label={`${monthTitle} ${day}${today === key ? ', today' : ''}, ${schedules.data ? `${entries.length} posts` : 'posting plans unavailable'}`}
                        className={`flex min-h-20 w-full min-w-0 flex-col items-start gap-1 p-1.5 text-left sm:min-h-28 sm:p-3 ${selectedDay === key ? 'bg-lime/25 ring-2 ring-inset ring-sage' : 'hover:bg-canvas'}`}
                      >
                        <span
                          aria-current={today === key ? 'date' : undefined}
                          className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${today === key ? 'bg-forest text-lime' : 'text-muted'}`}
                        >
                          {day}
                        </span>
                        {entries.length > 0 && (
                          <span className="max-w-full rounded bg-forest px-1.5 py-0.5 text-[9px] text-white sm:text-[10px]">
                            {entries.length} {entries.length === 1 ? 'post' : 'posts'}
                          </span>
                        )}
                        {entries.slice(0, 2).map((item) => (
                          <span
                            key={item.id}
                            className="hidden w-full truncate text-[10px] text-muted md:block"
                          >
                            {new Date(item.scheduledFor).toLocaleTimeString('en', {
                              timeZone: postingTimeZone,
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            · {item.angle}
                          </span>
                        ))}
                      </button>
                    ) : (
                      <div className="min-h-20 sm:min-h-28" aria-label="Outside this month" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-xs text-muted">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={16} /> Select a date to see its posts.
          </span>
          <label className="flex items-center gap-2">
            Show
            <select
              aria-label="Filter posting plans"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="field !w-auto !py-2 !text-xs"
            >
              <option value="active">Planned & published</option>
              <option value="scheduled">Planned</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </section>
      {schedules.data && (
        <section className="panel p-5 sm:p-6" aria-labelledby="agenda-heading">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="agenda-heading" className="text-lg font-semibold">
              {selectedDay ? `Posts for ${selectedDay}` : `Posts in ${monthTitle}`}{' '}
              <span className="ml-2 text-sm text-muted">({visiblePlans.length})</span>
            </h2>
            {selectedDay && (
              <button
                className="button-secondary !min-h-9 !py-2 !text-xs"
                onClick={() => setSelectedDay(null)}
              >
                Show whole month
              </button>
            )}
          </div>
          {visiblePlans.length ? (
            <div className="space-y-4">
              {visiblePlans.map((item) => (
                <article
                  key={item.id}
                  className="min-w-0 rounded-xl border border-line bg-canvas/50 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="badge">{statusLabels[item.status]}</span>
                    <span className="text-xs text-muted">
                      {formatPostingTime(item.scheduledFor)}
                    </span>
                  </div>
                  <h3 className="mt-3 break-words text-sm font-semibold">
                    Post {item.postIndex + 1} · {item.angle}
                  </h3>
                  <p className="mt-1 break-words text-xs text-muted">
                    {item.productName} · {item.platform === 'facebook' ? 'Facebook' : 'Instagram'} ·{' '}
                    {item.campaignTitle}
                  </p>
                  {item.status === 'scheduled' && new Date(item.scheduledFor).getTime() < now && (
                    <p className="mt-2 text-xs text-amber-800">
                      Past due. Share it now or choose a new date.
                    </p>
                  )}
                  {item.publishedAt && (
                    <p className="mt-2 text-xs text-muted">
                      Marked published: {formatPostingTime(item.publishedAt)}
                    </p>
                  )}
                  <p className="my-4 whitespace-pre-wrap break-words text-sm leading-6">
                    {item.caption}
                  </p>
                  <ScheduleActions
                    schedule={item}
                    onReschedule={() => setEditing({ schedule: item })}
                    onChanged={changed}
                  />
                  <Link
                    to={`/dashboard/campaigns/${item.campaignId}`}
                    className="mt-4 inline-flex text-xs font-semibold text-forest hover:underline"
                  >
                    Open campaign & poster →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No posts in this view"
              description={
                campaigns.data?.total
                  ? 'Plan a post, choose another date, or change the status filter.'
                  : 'Save a campaign draft first, then give its posts a date.'
              }
              to="/dashboard/campaigns"
              linkLabel="Open campaigns"
            />
          )}
        </section>
      )}
      {editing && (
        <ScheduleForm
          schedule={editing.schedule}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            changed('Posting plan saved.');
          }}
        />
      )}
    </>
  );
}
