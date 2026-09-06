import { authHeader } from '@/lib/firebase/authClient';
export type DirectoryMember = {
  id: string;
  full_name: string | null;
  experience_level: string | null;
  interests: string[] | null;
  created_at: string;
};

/** Only allowlisted fields cross the authenticated server boundary. */
export async function getDirectoryMembers(): Promise<DirectoryMember[]> {
  const response = await fetch('/api/directory', { headers: await authHeader(), cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load the member directory. Please try again.');
  return (await response.json()).members;
}
export async function getMemberProfile(userId: string): Promise<DirectoryMember | null> {
  const response = await fetch(`/api/directory?id=${encodeURIComponent(userId)}`, { headers: await authHeader(), cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load this member. Please try again.');
  return (await response.json()).member;
}
