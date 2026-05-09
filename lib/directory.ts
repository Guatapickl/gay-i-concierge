import { supabase } from '@/lib/supabase';

export type DirectoryMember = {
  id: string;
  full_name: string | null;
  experience_level: string | null;
  interests: string[] | null;
  created_at: string;
};

/**
 * Fetch all members for the community directory.
 * Returns public profile data only (no email/phone).
 */
export async function getDirectoryMembers(): Promise<DirectoryMember[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, experience_level, interests, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching directory:', error.message);
    return [];
  }
  return (data || []) as DirectoryMember[];
}

/**
 * Fetch a single member's public profile by their user ID.
 */
export async function getMemberProfile(userId: string): Promise<DirectoryMember | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, experience_level, interests, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching member profile:', error.message);
    return null;
  }
  return data as DirectoryMember | null;
}
