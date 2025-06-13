import { supabase } from './supabase';

/**
 * Save an RSVP to Supabase for a given profile and event date.
 * @param profileId - The profile ID of the user RSVPing
 * @param eventDate - ISO date string of the event (YYYY-MM-DD)
 * @returns True on success, false on error
 */
export async function saveRsvp(profileId: string, eventDate: string): Promise<boolean> {
  const { error } = await supabase
    .from('rsvps')
    .insert([{ profile_id: profileId, event_date: eventDate }]);

  if (error) {
    console.error('Failed to save RSVP:', error.message);
    return false;
  }

  return true;
}
