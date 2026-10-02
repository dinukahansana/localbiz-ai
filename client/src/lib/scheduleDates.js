export const postingTimeZone = 'Asia/Colombo';
export const postingTimeLabel = 'Sri Lanka · UTC+05:30';

export function postingInput(value) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: postingTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function postingDateKey(value) {
  return postingInput(value).slice(0, 10);
}

export function scheduledInstant(value) {
  // The date picker always uses the explicitly labelled Sri Lanka posting time.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a posting time.');
  return new Date(`${value}:00+05:30`).toISOString();
}

export function formatPostingTime(value) {
  return new Intl.DateTimeFormat('en', {
    timeZone: postingTimeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
