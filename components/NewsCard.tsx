"use client";

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Share2, Trash2 } from 'lucide-react';
import type { NewsItem } from '@/types/supabase';
import { relativeTime } from '@/lib/news';
import { shareNews } from '@/lib/news-sharing';

interface NewsCardProps {
  item: NewsItem;
  isSaved: boolean;
  userId: string | null;
  onToggleSave: (id: string) => Promise<void> | void;
  onRemove?: (id: string) => Promise<void>;
}

export default function NewsCard({ item, isSaved, userId, onToggleSave, onRemove }: NewsCardProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const perform = async (action: () => Promise<void> | void) => {
    setBusy(true); setMessage('');
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <article className="card p-6 md:p-8">
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
    {confirmRemove && onRemove && <div className="mt-4 p-4 rounded-lg border border-border bg-surface-soft text-sm">
      <p>Remove this story from the club feed? Future news updates will keep it removed.</p>
      <div className="flex gap-3 mt-3"><button disabled={busy} className="btn-secondary text-danger text-xs" onClick={() => perform(() => onRemove(item.id))}>{busy ? 'Removing…' : 'Remove story'}</button><button disabled={busy} className="btn-secondary text-xs" onClick={() => setConfirmRemove(false)}>Cancel</button></div>
    </div>}
    {message && <p role="status" className="mt-3 text-sm text-foreground-muted">{message}</p>}
  </article>;
}
