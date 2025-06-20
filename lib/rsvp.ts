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
