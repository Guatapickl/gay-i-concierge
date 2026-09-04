import { orderBy } from 'firebase/firestore';
import { getRow, listRows } from '@/lib/firebase/db';

export type DirectoryMember = {
  id: string;
  full_name: string | null;
  experience_level: string | null;
  interests: string[] | null;
  created_at: string;
};

type ProfileRow = DirectoryMember & Record<string, unknown>;

function toMember(p: ProfileRow): DirectoryMember {
  return {
    id: p.id,
    full_name: p.full_name ?? null,
    experience_level: p.experience_level ?? null,
    interests: p.interests ?? null,
    created_at: p.created_at,
  };
}

/**
 * Fetch all members for the community directory.
 * Returns public profile data only (no email/phone).
 */
export async function getDirectoryMembers(): Promise<DirectoryMember[]> {
  try {
    const rows = await listRows<ProfileRow>('user_profiles', orderBy('created_at', 'desc'));
    return rows.map(toMember);
  } catch (err) {
    console.error('Error fetching directory:', (err as Error).message);
    return [];
  }
}

/**
 * Fetch a single member's public profile by their user ID.
 */
export async function getMemberProfile(userId: string): Promise<DirectoryMember | null> {
  try {
    const row = await getRow<ProfileRow>('user_profiles', userId);
    return row ? toMember(row) : null;
  } catch (err) {
    console.error('Error fetching member profile:', (err as Error).message);
    return null;
  }
}
