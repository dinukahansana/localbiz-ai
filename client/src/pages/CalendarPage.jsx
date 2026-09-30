import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import PhaseNotice from '../components/PhaseNotice.jsx';

export default function CalendarPage() {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const today = new Date();
  const startDay = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((startDay + daysInMonth) / 7) * 7;

  function moveMonth(amount) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <>
      <PageHeader
        eyebrow="A LITTLE ROOM TO PLAN"
        title="Content calendar"
        description="See the bigger picture, one day at a time."
      />
      <section className="panel mb-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <h2 className="text-lg font-semibold" aria-live="polite">
            {month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="button-secondary !min-h-9 !px-3 !py-1.5 !text-xs"
              onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
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
        <div role="table" aria-label="Content calendar, no scheduled posts">
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
                const isToday =
                  inMonth &&
                  day === today.getDate() &&
                  month.getMonth() === today.getMonth() &&
                  month.getFullYear() === today.getFullYear();
                return (
                  <div
                    role="cell"
                    key={weekday}
                    className={`min-h-16 border-b border-r border-line p-2 last:border-r-0 sm:min-h-24 sm:p-3 ${inMonth ? 'bg-white' : 'bg-canvas/60'}`}
                    aria-label={
                      inMonth
                        ? `${month.toLocaleDateString('en', { month: 'long' })} ${day}${isToday ? ', today' : ''}, no posts`
                        : 'Outside this month'
                    }
                  >
                    {inMonth && (
                      <span
                        aria-current={isToday ? 'date' : undefined}
                        className={`grid size-6 place-items-center rounded-full text-xs ${isToday ? 'bg-forest text-lime' : 'text-muted'}`}
                      >
                        {day}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 p-5 text-xs text-muted">
          <CalendarDays size={17} className="text-sage" />A clear calendar, full of possibilities.
          No posts scheduled.
        </div>
      </section>
      <PhaseNotice>
        You can browse months. Scheduling posts and social account connections will arrive in future
        phases.
      </PhaseNotice>
    </>
  );
}
