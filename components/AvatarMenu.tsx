"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, BookOpen, Bell, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Top-right user menu. Shows sign in/up CTAs when signed out, and an avatar
 * dropdown (Profile / Resources / Alerts / Sign out) when signed in.
 */
export default function AvatarMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const user = data.user;
      setAuthed(!!user);
      setEmail(user?.email ?? null);
      if (user?.id) {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        setName((prof?.full_name as string | null) ?? null);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/');
    router.refresh();
  };

  if (authed === null) {
    return <div className="w-9 h-9 rounded-full bg-surface-elevated animate-pulse" />;
  }

  if (!authed) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/sign-in"
          className="text-sm text-foreground-muted hover:text-foreground transition-colors px-2 py-1.5"
        >
          Sign in
        </Link>
        <Link href="/auth/sign-up" className="btn-brand text-sm">
          Join
        </Link>
      </div>
    );
  }

  const display = name || email?.split('@')[0] || 'Member';
  const initial = (display[0] || 'M').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-full hover:bg-surface-hover transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #ff2d9b, #7c2fff)',
            color: '#fff',
          }}
        >
          {initial}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-surface border-[1.5px] border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in"
          style={{ boxShadow: '0 10px 40px rgba(124, 47, 255, 0.18)' }}
        >
          <div className="px-3.5 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground truncate">{display}</p>
            {email && (
              <p className="text-xs text-foreground-subtle truncate">{email}</p>
            )}
          </div>
          <nav className="py-1.5">
            <MenuLink href="/profile" icon={User} label="Profile" onClick={() => setOpen(false)} />
            <MenuLink href="/resources" icon={BookOpen} label="Resources" onClick={() => setOpen(false)} />
            <MenuLink href="/alerts" icon={Bell} label="Alerts" onClick={() => setOpen(false)} />
          </nav>
          <div className="border-t border-border py-1.5">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-danger hover:bg-surface-hover transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
