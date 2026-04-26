import { supabase } from './supabase';

/**
 * Save an RSVP. Posts through `/api/rsvp` so the server can also enqueue the
 * confirmation email and any reminder rows. Falls back to a direct insert if
 * the API path errors (e.g. dev without service-role key).
 */
export async function saveRsvp(profileId: string, eventId: string): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
