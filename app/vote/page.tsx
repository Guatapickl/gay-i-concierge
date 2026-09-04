"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Vote, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAllPolls } from '@/lib/polls';
import { isCurrentUserAdmin } from '@/lib/isAdmin';
import type { MeetingPoll } from '@/types/supabase';
import { LoadingSpinner } from '@/components/ui';

export default function VoteIndexPage() {
  const [polls, setPolls] = useState<MeetingPoll[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      const [list, admin] = await Promise.all([getAllPolls(), isCurrentUserAdmin(data.user.id)]);
      setPolls(list);
      setIsAdmin(admin);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner text="Loading polls…" className="mt-8" />;

  if (!signedIn) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto animate-fade-in">
        <Vote className="w-8 h-8 mx-auto text-primary mb-3" />
        <p className="font-semibold text-foreground mb-1">Sign in to vote</p>
        <p className="text-sm text-foreground-muted mb-4">Meeting date polls are for members.</p>
        <Link href="/auth/sign-in" className="btn-brand inline-flex text-sm">Sign in</Link>
      </div>
    );
  }

  const open = polls.filter(p => p.status === 'open');
  const closed = polls.filter(p => p.status !== 'open');

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Meeting date votes</h1>
          <p className="text-sm text-foreground-muted">Rank the dates that work for you.</p>
        </div>
        {isAdmin && (
          <Link href="/vote/new" className="btn-brand inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New poll
          </Link>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono">OPEN</h2>
        {open.length === 0 ? (
          <div className="card p-6 text-sm text-foreground-muted">No open polls right now.</div>
        ) : (
          open.map(p => (
            <Link key={p.id} href={`/vote/${p.id}`} className="card p-5 block hover:border-border-strong transition-colors">
              <div className="font-semibold text-foreground">{p.title}</div>
              {p.description && <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{p.description}</p>}
              {p.closes_at && (
                <p className="text-[11px] font-mono text-foreground-faint mt-2">
                  Closes {new Date(p.closes_at).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono">CLOSED</h2>
          {closed.map(p => (
            <Link key={p.id} href={`/vote/${p.id}`} className="card p-4 flex items-center gap-3 hover:border-border-strong transition-colors">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span className="text-sm text-foreground">{p.title}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
