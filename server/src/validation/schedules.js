export function validateScheduleDate(body, now = new Date()) {
  const value = body?.scheduledFor;
  const errors = {};
  let scheduledFor;
  const latest = new Date(now);
  latest.setUTCFullYear(latest.getUTCFullYear() + 2);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    errors.scheduledFor = 'Choose a valid posting date and time.';
  else {
    scheduledFor = new Date(value);
    if (!Number.isFinite(scheduledFor.getTime()) || scheduledFor.toISOString() !== value)
      errors.scheduledFor = 'Choose a valid posting date and time.';
    else if (scheduledFor <= now || scheduledFor > latest)
      errors.scheduledFor = 'Choose a future time within the next two years.';
  }
  return { scheduledFor, errors };
}

export function validateSchedule(body) {
  const { scheduledFor, errors } = validateScheduleDate(body);
  if (typeof body?.campaignId !== 'string' || !/^[a-f\d]{24}$/i.test(body.campaignId))
    errors.campaignId = 'Choose a saved campaign.';
  if (!Number.isInteger(body?.postIndex) || body.postIndex < 0 || body.postIndex > 2)
    errors.postIndex = 'Choose post 1, 2, or 3.';
  return { data: { campaign: body?.campaignId, postIndex: body?.postIndex, scheduledFor }, errors };
}
