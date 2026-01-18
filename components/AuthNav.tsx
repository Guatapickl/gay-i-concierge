"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AuthNav() {
  const [isAuthed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setAuthed(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => { sub.subscription.unsubscribe(); mounted = false; };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.reload();
  };

  if (!isAuthed) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href="/auth/sign-in"
          className="flex items-center justify-center px-4 py-2.5 bg-primary text-background text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-muted"
        >
          Sign In
        </Link>
        <Link
          href="/auth/sign-up"
          className="flex items-center justify-center px-4 py-2.5 bg-surface-elevated border border-border text-foreground-muted text-sm font-medium rounded-lg transition-all duration-150 hover:text-foreground hover:border-primary/30"
        >
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/profile"
        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-all"
      >
        <User size={16} />
        <span>Profile</span>
      </Link>
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg transition-all w-full text-left"
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
