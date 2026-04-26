import type { RecurrenceFrequency } from '@/types/supabase';

const DAY_OF_WEEK = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** Build an RRULE-lite string we display to the user and store on each instance. */
export function buildRecurrenceRule(
  frequency: RecurrenceFrequency,
  baseDate: Date
): string | null {
  if (frequency === 'none') return null;
  const byDay = DAY_OF_WEEK[baseDate.getDay()];
  if (frequency === 'weekly') return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${byDay}`;
  if (frequency === 'biweekly') return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${byDay}`;
  if (frequency === 'monthly') {
    const week = Math.ceil(baseDate.getDate() / 7);
    return `FREQ=MONTHLY;INTERVAL=1;BYDAY=${week}${byDay}`;
  }
  return null;
}

/** Human-readable label like "Every other Tuesday" or "Monthly on the 2nd Tuesday". */
export function describeRecurrence(rule: string | null | undefined): string | null {
  if (!rule) return null;
  const parts = Object.fromEntries(
    rule.split(';').map(p => p.split('=') as [string, string])
  );
  const dayCode = (parts.BYDAY || '').replace(/^[+-]?\d*/, '');
  const dayName = {
    SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday',
    TH: 'Thursday', FR: 'Friday', SA: 'Saturday',
  }[dayCode];
  if (parts.FREQ === 'WEEKLY' && parts.INTERVAL === '2') {
    return dayName ? `Every other ${dayName}` : 'Biweekly';
  }
  if (parts.FREQ === 'WEEKLY') {
    return dayName ? `Every ${dayName}` : 'Weekly';
  }
  if (parts.FREQ === 'MONTHLY') {
    const weekMatch = (parts.BYDAY || '').match(/^([+-]?\d+)/);
    const ordinal = ['', '1st', '2nd', '3rd', '4th', '5th'][Number(weekMatch?.[1] ?? '0')] || '';
    return dayName && ordinal ? `Monthly on the ${ordinal} ${dayName}` : 'Monthly';
  }
  return rule;
}

/** Generate the dates for a recurring series starting at baseDate. */
export function generateInstanceDates(
  baseDate: Date,
  frequency: RecurrenceFrequency,
  count: number
): Date[] {
  if (frequency === 'none' || count <= 1) return [baseDate];
  const dates: Date[] = [new Date(baseDate)];
  for (let i = 1; i < count; i++) {
    dates.push(addInterval(baseDate, frequency, i));
  }
  return dates;
}

function addInterval(base: Date, frequency: RecurrenceFrequency, n: number): Date {
  const d = new Date(base);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7 * n);
    return d;
  }
  if (frequency === 'biweekly') {
    d.setDate(d.getDate() + 14 * n);
    return d;
  }
  if (frequency === 'monthly') {
    return addMonthsPreservingNthWeekday(base, n);
  }
  return d;
}

/**
 * Preserve "Nth weekday of month" semantics. e.g. 2nd Tuesday in Jan -> 2nd Tuesday in Feb.
 * Falls back to last matching weekday if the Nth occurrence doesn't exist that month.
 */
function addMonthsPreservingNthWeekday(base: Date, n: number): Date {
  const targetDow = base.getDay();
  const week = Math.ceil(base.getDate() / 7); // 1..5
  const targetMonth = base.getMonth() + n;
  const target = new Date(base);
  target.setDate(1);
  target.setMonth(targetMonth);
  // Find first occurrence of targetDow in this month
  while (target.getDay() !== targetDow) {
    target.setDate(target.getDate() + 1);
  }
  // Advance to Nth occurrence
  target.setDate(target.getDate() + (week - 1) * 7);
  // If we overflowed into next month, back up one week (means we hit "5th X" but only 4 exist)
  if (target.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    target.setDate(target.getDate() - 7);
  }
  // Preserve original wall-clock time
  target.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
  return target;
}

/**
 * Build the rows for a recurring series. The caller persists them — keeping this
 * module pure means it stays safe to import from server contexts (email
 * templates, cron) without dragging in a browser Supabase client at module load.
 */
export function buildSeriesRows(args: {
  title: string;
  description: string | null;
  baseDateTime: string; // ISO
  location: string | null;
  agenda?: import('@/types/supabase').AgendaItem[] | null;
  recurrence: import('@/types/supabase').RecurrenceConfig;
}) {
  const { title, description, baseDateTime, location, agenda, recurrence } = args;
  const baseDate = new Date(baseDateTime);
  const dates = generateInstanceDates(baseDate, recurrence.frequency, recurrence.count);
  const rule = buildRecurrenceRule(recurrence.frequency, baseDate);
  const seriesId = recurrence.frequency === 'none' ? null : crypto.randomUUID();
  const until =
    recurrence.frequency === 'none' ? null : dates[dates.length - 1].toISOString();

  return dates.map(d => ({
    title,
    description,
    event_datetime: d.toISOString(),
    location,
    agenda: agenda ?? null,
    series_id: seriesId,
    recurrence_rule: rule,
    recurrence_until: until,
  }));
}
