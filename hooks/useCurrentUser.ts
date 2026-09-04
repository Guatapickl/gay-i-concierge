"use client";

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onUserChange } from '@/lib/firebase/authClient';

/**
 * Replaces the `const { data } = await supabase.auth.getUser()` pattern in
 * client components. `loading` is true until Firebase restores auth state.
 */
export function useCurrentUser(): { user: User | null; userId: string | null; email: string | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onUserChange(u => { setUser(u); setLoading(false); }), []);
  return { user, userId: user?.uid ?? null, email: user?.email ?? null, loading };
}
