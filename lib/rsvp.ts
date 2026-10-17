import { deleteDoc, setDoc, where } from 'firebase/firestore';
import { authHeader } from './firebase/authClient';
import { listRows, nowIso, payloadOf, ref } from './firebase/db';
import { isAttending, rsvpStatusOf, type RsvpCounts, type RsvpStatus } from './rsvpStatus';

export type { RsvpStatus, RsvpCounts } from './rsvpStatus';

/* ─── Types ──────────────────────────────────────────────────────── */

export type Attendee = {
  id: string;
  profile_id: string;
  name: string | null;
  status: RsvpStatus;
  rsvped_at: string;
};

export type AttendeeListResponse = {
  event_id: string;
  /** Members who answered "yes". */
  count: number;
  counts: RsvpCounts;
  attendees: Attendee[];
};

/* ─── Helpers ────────────────────────────────────────────────────── */

/** rsvps doc id — mirrors the Postgres (event_id, profile_id) unique key. */
export function rsvpDocId(eventId: string, profileId: string) {
  return `${eventId}_${profileId}`;
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const h = await authHeader();
  if (!h.Authorization) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: h.Authorization,
  };
}

/* ─── Public API ─────────────────────────────────────────────────── */

/**
 * Save an RSVP answer (yes, maybe or no). Posts through `/api/events/rsvp`
 * so the server can also enqueue the confirmation email and any reminder
 * rows. Falls back to a direct write if the API path errors (e.g. dev
 * without admin credentials).
 */
export async function saveRsvp(profileId: string, eventId: string, status: RsvpStatus = 'yes'): Promise<boolean> {
  try {
    const headers = await authHeaders();
    if (headers) {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event_id: eventId, status }),
      });
      if (res.ok) return true;
      // fall through to direct insert on server error
    }
  } catch (err) {
    console.warn('RSVP API path failed, falling back to direct insert:', err);
  }

  try {
    const now = nowIso();
    await setDoc(
      ref('rsvps', rsvpDocId(eventId, profileId)),
      payloadOf({ profile_id: profileId, event_id: eventId, status, created_at: now, updated_at: now }),
    );
    return true;
  } catch (err) {
    console.error('Failed to save RSVP:', (err as Error).message);
    return false;
  }
}

/**
 * Delete an RSVP for the given profile and event.
 */
export async function deleteRsvp(profileId: string, eventId: string): Promise<boolean> {
  try {
    const headers = await authHeaders();
    if (headers) {
      const res = await fetch(`/api/events/rsvp?event_id=${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) return true;
    }
  } catch (err) {
    console.warn('RSVP DELETE API failed, falling back to direct delete:', err);
  }

  try {
    await deleteDoc(ref('rsvps', rsvpDocId(eventId, profileId)));
    return true;
  } catch (err) {
    console.error('Failed to delete RSVP:', (err as Error).message);
    return false;
  }
}

/**
 * Every answer the member has given, keyed by event id.
 */
export async function getRsvpStatuses(profileId: string): Promise<Record<string, RsvpStatus>> {
  try {
    const rows = await listRows<{ event_id: string; status?: unknown }>('rsvps', where('profile_id', '==', profileId));
    const out: Record<string, RsvpStatus> = {};
    for (const row of rows) out[row.event_id] = rsvpStatusOf(row) ?? 'yes';
    return out;
  } catch (err) {
    console.error('Failed to load RSVPs:', (err as Error).message);
    return {};
  }
}

/**
 * Event IDs the member is going to, or might go to. Members who answered
 * "no" are not included.
 */
export async function getRsvpedEventIds(profileId: string): Promise<string[]> {
  const statuses = await getRsvpStatuses(profileId);
  return Object.entries(statuses).filter(([, status]) => isAttending(status)).map(([eventId]) => eventId);
}

/**
 * The current user's answer for an event via the API: null when signed out
 * or unanswered.
 */
export async function checkRsvpStatus(eventId: string): Promise<RsvpStatus | null> {
  try {
    const headers = await authHeaders();
    if (!headers) return null;
    const res = await fetch(
      `/api/events/rsvp?event_id=${encodeURIComponent(eventId)}&check=true`,
      { headers },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return rsvpStatusOf(data.status ? { status: data.status } : null);
  } catch {
    return null;
  }
}

/**
 * Fetch the attendee list for an authenticated member.
 */
export async function getEventAttendees(eventId: string): Promise<AttendeeListResponse> {
  try {
    const res = await fetch(
      `/api/events/rsvp?event_id=${encodeURIComponent(eventId)}`,
      { headers: await authHeader(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load attendees:', err);
    return { event_id: eventId, count: 0, counts: { yes: 0, maybe: 0, no: 0 }, attendees: [] };
  }
}

/* ─── Organizer view: next meeting RSVPs ─────────────────────────── */

export type MeetingSummary = {
  id: string;
  title: string;
  event_datetime: string | null;
  location: string | null;
};

export type MeetingAttendee = {
  id: string;
  profile_id: string;
  name: string | null;
  /** Only present when the member has no name on file; never alongside a name. */
  email: string | null;
  status: RsvpStatus;
  rsvped_at: string | null;
};

export type NextMeetingRsvps = {
  /** Null when no meeting is scheduled after now (and none was requested). */
  event: MeetingSummary | null;
  is_next_meeting: boolean;
  upcoming_events: MeetingSummary[];
  /** Every answer, including "can't make it". */
  count: number;
  counts: RsvpCounts;
  attendees: MeetingAttendee[];
  generated_at: string;
};

export class RsvpViewError extends Error {
  /** HTTP status of the failed request, or null when the request never completed. */
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'RsvpViewError';
    this.status = status;
  }
}

/**
 * Load the organizer's RSVP view for the next meeting, or for `eventId` when
 * given. Unlike `getEventAttendees`, a failure is thrown (with the HTTP
 * status when there is one) instead of being reported as an empty list, so
 * the caller can tell "could not load" apart from "nobody has RSVP'd".
 */
export async function getNextMeetingRsvps(eventId?: string | null): Promise<NextMeetingRsvps> {
  const headers = await authHeader();
  if (!headers.Authorization) throw new RsvpViewError('Sign in to view RSVPs.', 401);
  const query = eventId ? `?event_id=${encodeURIComponent(eventId)}` : '';
  let res: Response;
  try {
    res = await fetch(`/api/events/attendees${query}`, { headers, cache: 'no-store' });
  } catch (err) {
    throw new RsvpViewError(`Could not reach the server (${(err as Error).message}).`, null);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = String((await res.json())?.error ?? '');
    } catch {
      /* non-JSON error body */
    }
    throw new RsvpViewError(detail || `Request failed (HTTP ${res.status}).`, res.status);
  }
  return (await res.json()) as NextMeetingRsvps;
}
