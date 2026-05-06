import { supabase } from './supabase';

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

async function authHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/* ─── Public API ─────────────────────────────────────────────────── */

/**
 * Save an RSVP. Posts through `/api/events/rsvp` so the server can also
 * enqueue the confirmation email and any reminder rows. Falls back to a
 * direct insert if the API path errors (e.g. dev without service-role key).
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

  const { error } = await supabase
    .from('rsvps')
    .insert([{ profile_id: profileId, event_id: eventId }]);

  if (error) {
    console.error('Failed to save RSVP:', error.message);
    return false;
  }

  return true;
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

  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('profile_id', profileId)
    .eq('event_id', eventId);
  if (error) {
    console.error('Failed to delete RSVP:', error.message);
    return false;
  }
  return true;
}

/**
 * Get event IDs that the profile has RSVPed for.
 */
export async function getRsvpedEventIds(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('rsvps')
    .select('event_id')
    .eq('profile_id', profileId);
  if (error) {
    console.error('Failed to load RSVPs:', error.message);
    return [];
  }
  return (data || []).map(r => r.event_id);
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
 * Fetch the full attendee list for an event. Does not require authentication
 * (visibility is controlled by Supabase RLS on the rsvps table).
 */
export async function getEventAttendees(eventId: string): Promise<AttendeeListResponse> {
  try {
    const res = await fetch(
      `/api/events/rsvp?event_id=${encodeURIComponent(eventId)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load attendees:', err);
    return { event_id: eventId, count: 0, attendees: [] };
  }
}
