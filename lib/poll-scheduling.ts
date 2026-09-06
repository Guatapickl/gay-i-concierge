export const MEETING_TIME_ZONE = 'America/New_York';

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MEETING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function localParts(instant: Date) {
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(instant).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function newYorkDate(instant: string): string {
  return localParts(new Date(instant)).date;
}

/** Resolve a selected wall-clock time without relying on the browser's timezone.
 * Reject DST gaps and overlaps so booking never silently shifts an admin's time.
 */
export function newYorkMeetingTime(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Choose a valid meeting date and time in New York.');
  }
  const nominal = new Date(`${date}T${time}:00.000Z`);
  if (!Number.isFinite(nominal.getTime()) || nominal.toISOString().slice(0, 10) !== date) {
    throw new Error('Choose a valid meeting date.');
  }
  const matches: Date[] = [];
  // Modern New York offsets are integral hours; round-trip to Intl's zone data
  // so spring gaps and autumn overlaps are detected rather than normalized.
  for (let offset = -14; offset <= 14; offset++) {
    const candidate = new Date(nominal.getTime() + offset * 3_600_000);
    const local = localParts(candidate);
    if (local.date === date && local.time === time) matches.push(candidate);
  }
  if (!matches.length) throw new Error('That time does not exist in New York because of daylight saving time. Choose another time.');
  if (matches.length > 1) throw new Error('That time occurs twice in New York because of daylight saving time. Choose another time.');
  return matches[0].toISOString();
}

export function isPollOpen(poll: { status: string; closes_at: string | null }, now = Date.now()): boolean {
  return poll.status === 'open' && (!poll.closes_at || Date.parse(poll.closes_at) > now);
}

export function formatPollDeadline(instant: string): string {
  return new Date(instant).toLocaleString('en-US', {
    timeZone: MEETING_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}
