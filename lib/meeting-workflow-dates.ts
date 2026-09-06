export const MEETING_TIME_ZONE = 'America/New_York';
export function localDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MEETING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}
export function followingMonth(date: string): string {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}
export function weekendDates(month: string): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, m] = month.split('-').map(Number);
  const dates: string[] = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(Date.UTC(year, m - 1, day));
    if (date.getUTCMonth() !== m - 1) break;
    if ([0, 6].includes(date.getUTCDay())) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}
export function dateQuestionId(date: string) { return `date_${date.replaceAll('-', '_')}`; }
export function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
}
export function selectedDates(dates: string[], answers: unknown): string[] {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('All availability answers are required');
  const values = answers as Record<string, unknown>;
  if (Object.keys(values).length !== dates.length || dates.some(date => (values[dateQuestionId(date)] !== 'Available' && values[dateQuestionId(date)] !== 'Unavailable'))) throw new Error('Invalid availability answers');
  return dates.filter(date => values[dateQuestionId(date)] === 'Available');
}
/** Placeholder for a date-only poll; administrator selects the actual meeting time. */
export function pollDateTimestamp(date: string): string { return `${date}T19:00:00.000Z`; }
