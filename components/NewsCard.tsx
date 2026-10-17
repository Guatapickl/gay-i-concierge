"use client";

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Check, MessageSquare, Share2, Trash2 } from 'lucide-react';
import type { NewsItem } from '@/types/supabase';
import { relativeTime } from '@/lib/news';
import { shareNews } from '@/lib/news-sharing';

/**
 * Discussion vote state for one story:
 * - `undefined`: still loading
 * - `null`: the votes could not be loaded (shown as unavailable, never as zero)
 * - `{ count, votedByMe }`: the current total and whether this member voted
 */
export type DiscussionState = { count: number; votedByMe: boolean } | null | undefined;

export const DISCUSS_LABEL = 'I want to talk about this';

export function discussionCountLabel(state: DiscussionState): string {
  if (state === undefined) return 'Loading votes…';
  if (state === null) return 'Vote count unavailable';
  return `${state.count} ${state.count === 1 ? 'vote' : 'votes'}`;
}

interface NewsCardProps {
  item: NewsItem;
  isSaved: boolean;
  userId: string | null;
  onToggleSave: (id: string) => Promise<void> | void;
  onRemove?: (id: string) => Promise<void>;
  /** Present when the feed loads discussion votes; the button is hidden otherwise. */
  discussion?: DiscussionState;
  onToggleDiscussion?: (id: string, voted: boolean) => Promise<void>;
}

export default function NewsCard({ item, isSaved, userId, onToggleSave, onRemove, discussion, onToggleDiscussion }: NewsCardProps) {
  const [busy, setBusy] = useState(false);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const perform = async (action: () => Promise<void> | void) => {
    setBusy(true); setMessage('');
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const votedByMe = discussion?.votedByMe === true;
  const vote = () => perform(async () => {
    if (!onToggleDiscussion) return;
    setVoting(true);
    try {
      await onToggleDiscussion(item.id, !votedByMe);
      setMessage(votedByMe ? 'Vote withdrawn.' : 'Counted. Organizers can add this story to the next agenda.');
    } finally { setVoting(false); }
  });
  return <article className="card p-6 md:p-8" data-news-id={item.id}>
    <div className="flex flex-wrap justify-between gap-3 mb-4"><span className="eyebrow text-primary">{item.tag || 'AI news'}{item.is_hot ? ' · Trending' : ''}</span><time className="text-xs font-mono text-foreground-muted">{relativeTime(item.published_at || item.ingested_at)}</time></div>
    <h2 className="text-xl md:text-2xl font-display font-semibold leading-snug"><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{item.title}</a></h2>
    <p className="text-sm md:text-base text-foreground-muted leading-relaxed mt-3">{item.summary}</p>
    <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
      <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-medium">Read source →{item.source_name ? <span className="text-foreground-muted text-xs ml-3">{item.source_name}</span> : null}</a>
      <div className="flex flex-wrap gap-2">
        {userId && <>
          <button disabled={busy} onClick={() => perform(() => onToggleSave(item.id))} aria-pressed={isSaved} aria-label={isSaved ? 'Remove from saved' : 'Save article'} className="btn-secondary inline-flex items-center gap-2 text-xs disabled:opacity-50">{isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}{isSaved ? 'Saved' : 'Save'}</button>
          <button disabled={busy} onClick={() => perform(async () => { const result = await shareNews(item); setMessage(result === 'copied' ? 'Source link copied.' : result === 'shared' ? 'Shared.' : ''); })} className="btn-secondary inline-flex items-center gap-2 text-xs disabled:opacity-50"><Share2 className="w-4 h-4" />Share</button>
        </>}
        {onRemove && <button disabled={busy} onClick={() => setConfirmRemove(true)} className="btn-secondary inline-flex items-center gap-2 text-xs text-danger disabled:opacity-50"><Trash2 className="w-4 h-4" />Remove</button>}
      </div>
    </div>
    {userId && onToggleDiscussion && <div className="flex flex-wrap items-center gap-3 mt-4" data-discussion={discussion === undefined ? 'loading' : discussion === null ? 'unavailable' : votedByMe ? 'voted' : 'open'}>
      <button
        type="button"
        disabled={busy || discussion == null}
        aria-pressed={votedByMe}
        aria-busy={voting}
        title={discussion === undefined ? 'Loading your vote' : discussion === null ? 'Votes are unavailable right now; retry above' : votedByMe ? 'Withdraw your vote' : 'Vote to put this story on the next meeting agenda'}
        onClick={vote}
        className={`btn-secondary inline-flex items-center gap-2 text-xs disabled:opacity-50 ${votedByMe ? 'border-primary text-primary' : ''}`}
      >
        {votedByMe ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}{DISCUSS_LABEL}
      </button>
      <span className="badge" aria-live="polite">{voting ? 'Saving…' : discussionCountLabel(discussion)}</span>
    </div>}
    {confirmRemove && onRemove && <div className="mt-4 p-4 rounded-lg border border-border bg-surface-soft text-sm">
      <p>Remove this story from the club feed? Future news updates will keep it removed.</p>
      <div className="flex gap-3 mt-3"><button disabled={busy} className="btn-secondary text-danger text-xs" onClick={() => perform(() => onRemove(item.id))}>{busy ? 'Removing…' : 'Remove story'}</button><button disabled={busy} className="btn-secondary text-xs" onClick={() => setConfirmRemove(false)}>Cancel</button></div>
    </div>}
    {message && <p role="status" className="mt-3 text-sm text-foreground-muted">{message}</p>}
  </article>;
}
