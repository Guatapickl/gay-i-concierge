import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/firebase/session';

export const metadata: Metadata = { title: 'Member directory', description: 'Find and connect with Gay I Club members.', alternates: { canonical: 'https://gayiclub.com/community' }, robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!await getServerUser()) redirect('/auth/sign-in');
  return children;
}
