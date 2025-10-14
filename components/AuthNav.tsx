"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function btnBase(extra: string = '') {
  return `relative inline-flex items-center justify-center px-8 py-3 text-sm font-bold uppercase tracking-wider min-w-[140px] text-center bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-400/30 text-cyan-400 rounded-lg transition-all duration-300 ease-out hover:bg-gray-700/50 hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] active:transform active:scale-95 ${extra}`;
}

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
    // Force refresh to update any server-side or client state
    if (typeof window !== 'undefined') window.location.reload();
  };

  if (!isAuthed) {
    return (
      <div className="flex gap-3">
        <Link href="/auth/sign-in" className={btnBase()}>LOGIN</Link>
        <Link href="/auth/sign-up" className={btnBase()}>SIGN UP</Link>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Link href="/profile" className={btnBase()}>PROFILE</Link>
      <button onClick={signOut} className={btnBase('text-rose-300 border-rose-400/50 hover:border-rose-400/80')}>LOG OUT</button>
    </div>
  );
}

