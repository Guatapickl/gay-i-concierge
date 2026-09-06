import { deleteDoc, setDoc, where } from 'firebase/firestore';
import { authHeader } from './firebase/authClient';
import { listRows, nowIso, payloadOf, ref } from './firebase/db';

/* ─── Types ──────────────────────────────────────────────────────── */

export type Attendee = {
  id: string;
  profile_id: string;
  name: string | null;
  rsvped_at: string;
};

export type AttendeeListResponse = {
  event_id: string;
  count: number;
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
 * Save an RSVP. Posts through `/api/events/rsvp` so the server can also
 * enqueue the confirmation email and any reminder rows. Falls back to a
 * direct write if the API path errors (e.g. dev without admin credentials).
 */
export async function saveRsvp(profileId: string, eventId: string): Promise<boolean> {
  try {
    const headers = await authHeaders();
    if (headers) {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.ok) return true;
      // fall through to direct insert on server error
    }
  } catch (err) {
    console.warn('RSVP API path failed, falling back to direct insert:', err);
  }

  try {
    await setDoc(
      ref('rsvps', rsvpDocId(eventId, profileId)),
      payloadOf({ profile_id: profileId, event_id: eventId, created_at: nowIso() }),
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
 * Get event IDs that the profile has RSVPed for.
 */
export async function getRsvpedEventIds(profileId: string): Promise<string[]> {
  try {
    const rows = await listRows<{ event_id: string }>('rsvps', where('profile_id', '==', profileId));
    return rows.map(r => r.event_id);
  } catch (err) {
    console.error('Failed to load RSVPs:', (err as Error).message);
    return [];
  }
}

/**
 * Check if the current user has RSVPed to a specific event via the API.
 * Returns null if the user is not authenticated.
 */
export async function checkRsvpStatus(eventId: string): Promise<boolean | null> {
  try {
    const headers = await authHeaders();
    if (!headers) return null;
    const res = await fetch(
      `/api/events/rsvp?event_id=${encodeURIComponent(eventId)}&check=true`,
      { headers },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.rsvped ?? null;
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
    return { event_id: eventId, count: 0, attendees: [] };
  }
}
