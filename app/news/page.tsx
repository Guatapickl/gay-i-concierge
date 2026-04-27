"use client";

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getNewsItems,
  getSavedNewsIds,
  toggleSavedNews,
  relativeTime,
  colorForTag,
} from '@/lib/news';
import type { NewsItem } from '@/types/supabase';
import { Alert, LoadingSpinner } from '@/components/ui';

export default function NewsFeedPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setUserId(uid);

      const news = await getNewsItems();
      setItems(news);

      if (uid) {
        const s = await getSavedNewsIds(uid);
        setSaved(s);
      }
      setLoading(false);
    })();
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.tag) set.add(i.tag);
    });
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  const filtered = filter === 'All' ? items : items.filter(i => i.tag === filter);

  const toggleSave = async (id: string) => {
    if (!userId) return;
    const nowSaved = await toggleSavedNews(userId, id);
    setSaved(prev => {
      const next = new Set(prev);
      if (nowSaved) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (loading) return <LoadingSpinner text="Loading news..." className="py-12" />;

  return (
    <div className="space-y-5 animate-fade-in">
      {items.length === 0 && (
        <Alert variant="info">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-sm">
              The news pipeline is connected but empty. Once The Cortex&rsquo;s nightly
              ingestion has its first successful run, summarized stories will appear
              here automatically.
            </div>
          </div>
        </Alert>
      )}

      {tags.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(t => {
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3.5 py-1.5 rounded-full text-xs transition-all border-[1.5px] ${
                  active
                    ? 'bg-surface-soft border-primary text-primary-muted font-bold'
                    : 'bg-transparent border-border-subtle text-foreground-muted hover:border-border-strong'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-foreground-muted">No items in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const isSaved = saved.has(item.id);
            const color = colorForTag(item.tag, item.tag_color);
            return (
              <article key={item.id} className="card p-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  {item.tag && (
                    <span
                      className="text-[11px] font-bold tracking-[0.08em] px-2.5 py-0.5 rounded-full font-mono"
                      style={{
                        border: `1.5px solid ${color}`,
                        color,
                        background: `${color}12`,
                      }}
                    >
                      {item.tag}
                    </span>
                  )}
                  {item.is_hot && (
                    <span className="text-xs text-[#e05000] font-semibold">🔥 Hot</span>
                  )}
                </div>
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[15px] text-foreground leading-snug hover:text-primary-muted transition-colors"
                >
                  {item.title}
                </a>
                <p className="text-[13px] text-foreground-muted leading-relaxed flex-1">
                  {item.summary}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-foreground-faint font-mono">
                    {item.source_name || new URL(item.source_url).hostname.replace('www.', '')}
                    {' · '}
                    {relativeTime(item.published_at || item.ingested_at)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground-faint hover:text-foreground transition-colors p-1"
                      aria-label="Open source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {userId && (
                      <button
                        onClick={() => toggleSave(item.id)}
                        className={`rounded-md px-2 py-1 text-[11px] transition-colors border ${
                          isSaved
                            ? 'border-[#ff9e3b] text-[#c05200] font-bold'
                            : 'border-border-subtle text-foreground-faint hover:text-foreground'
                        }`}
                      >
                        {isSaved ? '★ Saved' : '☆ Save'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
