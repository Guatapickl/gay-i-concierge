/**
 * RSVP answers. Shared by client code, API routes and email templates, so it
 * imports nothing from Firebase.
 *
 * An `rsvps` document records one member's answer to one event. Documents
 * written before answers existed have no `status` and mean "yes".
 */

export type RsvpStatus = 'yes' | 'maybe' | 'no';

export const RSVP_STATUSES: readonly RsvpStatus[] = ['yes', 'maybe', 'no'] as const;

export const RSVP_LABELS: Record<RsvpStatus, { short: string; action: string; sentence: string }> = {
  yes: { short: 'Going', action: "I'm coming", sentence: "You're going" },
  maybe: { short: 'Maybe', action: 'Maybe', sentence: 'You might come' },
  no: { short: "Can't make it", action: "Can't make it", sentence: "You can't make it" },
};

export function parseRsvpStatus(value: unknown): RsvpStatus | null {
  return typeof value === 'string' && (RSVP_STATUSES as readonly string[]).includes(value) ? (value as RsvpStatus) : null;
}

/** The answer stored on an rsvps row; a row without `status` is a legacy "yes". */
export function rsvpStatusOf(row: { status?: unknown } | null | undefined): RsvpStatus | null {
  if (!row) return null;
  return parseRsvpStatus(row.status) ?? 'yes';
}

/** Whether an answer should count the member as (possibly) attending. */
export function isAttending(status: RsvpStatus | null | undefined): boolean {
  return status === 'yes' || status === 'maybe';
}

/** Link that records an answer once the member is signed in (handled on the event page). */
export function rsvpAnswerUrl(siteUrl: string, eventId: string, status: RsvpStatus): string {
  return `${siteUrl.replace(/\/$/, '')}/events/${encodeURIComponent(eventId)}?rsvp=${status}`;
}

export type RsvpCounts = Record<RsvpStatus, number>;

export function countRsvps(rows: { status?: unknown }[]): RsvpCounts {
  const counts: RsvpCounts = { yes: 0, maybe: 0, no: 0 };
  for (const row of rows) counts[rsvpStatusOf(row) ?? 'yes'] += 1;
  return counts;
}

/** Move one answer between per-answer tallies (for optimistic UI updates). */
export function applyAnswer(counts: RsvpCounts, previous: RsvpStatus | null, next: RsvpStatus | null): RsvpCounts {
  const out = { ...counts };
  if (previous) out[previous] = Math.max(0, out[previous] - 1);
  if (next) out[next] += 1;
  return out;
}
