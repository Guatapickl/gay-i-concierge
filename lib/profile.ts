import { supabase } from './supabase';
import { Profile } from '@/types/supabase';

/**
 * Save a new profile to Supabase.
 * Note: This function is side-effect free (does not touch localStorage).
 * Caller components can persist returned IDs in localStorage as needed.
 * @param profile - Profile data without 'id' and 'created_at'
 * @returns The new profile ID, or null on error
 */
export async function saveProfile(
  profile: Omit<Profile, 'id' | 'created_at'>
): Promise<string | null> {
  // Define the insert payload matching Supabase column names
  type ProfileInsert = {
    name: Profile['name'];
    email: Profile['email'];
    interests: Profile['interests'];
    // experience_level column in snake_case
    experience_level: NonNullable<Profile['experienceLevel']>;
  };
  const insertData: ProfileInsert = {
    name: profile.name,
    // Ensure null is used instead of undefined
    email: profile.email ?? null,
    interests: profile.interests,
    // Map camelCase to snake_case for Supabase
    experience_level: profile.experienceLevel!,
  };
  const { data, error } = await supabase
    .from('profiles')
    .insert([insertData])
    .select('id')
    .single();

  if (error || !data) {
    // Enhanced logging for debugging Supabase insert failures
    console.error(
      '❌ Error saving profile to Supabase:',
      error?.message || '',
      error?.details || '',
      error?.hint || ''
    );
    return null;
  }
  return data.id;
}
