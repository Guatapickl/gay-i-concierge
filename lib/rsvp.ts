import { supabase } from './supabase';

/**
 * Save an RSVP to Supabase for a given profile and event.
 * @param profileId - The profile ID of the user RSVPing
 * @param eventId - The ID of the event being RSVPed to
 * @returns True on success, false on error
 */
export async function saveRsvp(profileId: string, eventId: string): Promise<boolean> {
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
