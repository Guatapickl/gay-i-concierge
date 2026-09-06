import { addDoc } from 'firebase/firestore';
import { col, nowIso, payloadOf } from './firebase/db';
import { currentUser } from './firebase/authClient';
import { Profile } from '@/types/supabase';

/**
 * Save a new profile to Firestore (`profiles` collection).
 * Note: This function is side-effect free (does not touch localStorage).
 * Caller components can persist returned IDs in localStorage as needed.
 * @param profile - Profile data without 'id' and 'created_at'
 * @returns The new profile ID, or null on error
 */
export async function saveProfile(
  profile: Omit<Profile, 'id' | 'created_at'>
): Promise<string | null> {
  // Insert payload keeps the Postgres column names (snake_case).
  type ProfileInsert = {
    name: Profile['name'];
    email: Profile['email'];
    interests: Profile['interests'];
    experience_level: NonNullable<Profile['experienceLevel']>;
    created_at: string;
  };
  const user = await currentUser();
  if (!user) return null;
  const insertData: ProfileInsert & { user_id: string } = {
    user_id: user.uid,
    name: profile.name,
    email: profile.email ?? null,
    interests: profile.interests,
    experience_level: profile.experienceLevel!,
    created_at: nowIso(),
  };
  try {
    const d = await addDoc(col('profiles'), payloadOf(insertData));
    return d.id;
  } catch (err) {
    console.error('❌ Error saving profile:', (err as Error).message);
    return null;
  }
}
