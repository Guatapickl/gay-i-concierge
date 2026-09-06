"use client";

import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { NewsItem } from '@/types/supabase';
import { relativeTime } from '@/lib/news';

interface NewsCardProps {
  item: NewsItem;
  isSaved: boolean;
  userId: string | null;
  onToggleSave: (id: string) => void;
}

export default function NewsCard({ item, isSaved, userId, onToggleSave }: NewsCardProps) {
  return <article className="card p-6 md:p-8">
    <div className="flex flex-wrap justify-between gap-3 mb-4"><span className="eyebrow text-primary">{item.tag || 'AI news'}{item.is_hot ? ' · Trending' : ''}</span><time className="text-xs font-mono text-foreground-muted">{relativeTime(item.published_at || item.ingested_at)}</time></div>
    <h2 className="text-xl md:text-2xl font-display font-semibold leading-snug"><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">{item.title}</a></h2>
    <p className="text-sm md:text-base text-foreground-muted leading-relaxed mt-3">{item.summary}</p>
    <div className="flex flex-wrap items-center justify-between gap-4 mt-6"><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-medium">Read source →{item.source_name ? <span className="text-foreground-muted text-xs ml-3">{item.source_name}</span> : null}</a>{userId && <button onClick={() => onToggleSave(item.id)} aria-pressed={isSaved} aria-label={isSaved ? 'Remove from saved' : 'Save article'} className="btn-secondary inline-flex items-center gap-2 text-xs">{isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}{isSaved ? 'Saved' : 'Save'}</button>}</div>
  </article>;
}
