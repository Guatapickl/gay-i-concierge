"use client";

import { useCallback, useEffect, useState } from 'react';
import { ThumbsUp, Lightbulb, Trash2, Check, X } from 'lucide-react';
import { currentUser } from '@/lib/firebase/authClient';
import {
  getSuggestions,
  addSuggestion,
  toggleSuggestionVote,
  setSuggestionStatus,
  deleteSuggestion,
} from '@/lib/agendaSuggestions';
import { isCurrentUserAdmin } from '@/lib/isAdmin';
import type { AgendaSuggestion } from '@/types/supabase';
import { Button, FormInput, FormTextarea, Alert } from '@/components/ui';

/**
 * "What should we discuss?" — members propose topics for a meeting and
 * upvote each other's. Admins accept/decline and can pull accepted topics
 * into the agenda maker.
 *
 * eventId = null shows the general pool for "the next meeting".
 */
export default function AgendaSuggestions({
  eventId,
  compact = false,
}: {
  eventId: string | null;
  compact?: boolean;
}) {
  const [items, setItems] = useState<AgendaSuggestion[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [user, list] = await Promise.all([currentUser(), getSuggestions(eventId)]);
    const uid = user?.uid ?? null;
    setUserId(uid);
    setItems(list);
    if (uid) setIsAdmin(await isCurrentUserAdmin(uid));
    setLoaded(true);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const ok = await addSuggestion({ eventId, title: title.trim(), notes: notes.trim() || null });
    setBusy(false);
    if (!ok) {
      setError('Could not save your suggestion. Are you signed in?');
      return;
    }
    setTitle('');
    setNotes('');
    await load();
  };

  const vote = async (s: AgendaSuggestion) => {
    const ok = await toggleSuggestionVote(s.id, !!s.voted_by_me);
    if (ok) await load();
  };

  const setStatus = async (s: AgendaSuggestion, status: AgendaSuggestion['status']) => {
    if (await setSuggestionStatus(s.id, status)) await load();
  };

  const remove = async (s: AgendaSuggestion) => {
    if (await deleteSuggestion(s.id)) await load();
  };

  if (!loaded) return null;

  return (
    <div className={compact ? 'space-y-3' : 'card p-5 md:p-6 space-y-4'}>
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-display font-bold text-foreground">What should we discuss?</h2>
      </div>
      <p className="text-sm text-foreground-muted">
        Propose a topic, demo, paper, or question for the meeting. Upvote the ones you want to hear.
      </p>

      {userId ? (
        <form onSubmit={submit} className="space-y-2">
          <FormInput
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Topic (e.g. “Hands-on with the new Claude agent SDK”)"
            required
          />
          <FormTextarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why it's interesting, links, whether you'd present it… (optional)"
            rows={2}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={busy || !title.trim()}>
            {busy ? 'Adding…' : 'Suggest topic'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-foreground-faint">Sign in to suggest a topic.</p>
      )}

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {items.length === 0 ? (
        <p className="text-sm text-foreground-faint">No suggestions yet — be the first.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(s => (
            <li
              key={s.id}
              className={`flex gap-3 p-3 rounded-lg border ${
                s.status === 'accepted'
                  ? 'bg-primary-subtle border-primary'
                  : s.status === 'declined'
                  ? 'bg-surface-elevated border-border opacity-60'
                  : 'bg-surface-elevated border-border'
              }`}
            >
              <button
                onClick={() => vote(s)}
                disabled={!userId}
                className={`flex flex-col items-center justify-center min-w-[44px] rounded-md border px-2 py-1 text-xs font-bold transition-colors ${
                  s.voted_by_me
                    ? 'border-primary text-primary-muted bg-primary-subtle'
                    : 'border-border-subtle text-foreground-subtle hover:text-foreground'
                }`}
                aria-label={s.voted_by_me ? 'Remove upvote' : 'Upvote'}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {s.vote_count ?? 0}
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground text-sm">
                  {s.title}
                  {s.status === 'accepted' && <span className="badge badge-primary ml-2">On the agenda</span>}
                  {s.status === 'declined' && <span className="badge ml-2">Not this time</span>}
                </div>
                {s.notes && <p className="text-sm text-foreground-muted mt-0.5 whitespace-pre-line">{s.notes}</p>}
                <p className="text-[11px] text-foreground-faint mt-1 font-mono">
                  {s.author_name || 'member'} · {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              {(isAdmin || s.user_id === userId) && (
                <div className="flex items-start gap-1 shrink-0">
                  {isAdmin && s.status !== 'accepted' && (
                    <button onClick={() => setStatus(s, 'accepted')} className="p-1.5 text-success hover:opacity-70" aria-label="Accept">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {isAdmin && s.status !== 'declined' && (
                    <button onClick={() => setStatus(s, 'declined')} className="p-1.5 text-foreground-subtle hover:text-foreground" aria-label="Decline">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => remove(s)} className="p-1.5 text-foreground-subtle hover:text-danger" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
