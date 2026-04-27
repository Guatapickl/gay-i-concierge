import { supabase } from './supabase';
import type { NewsItem } from '@/types/supabase';

export async function getNewsItems(limit = 60): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Failed to load news items:', error.message);
    return [];
  }
  return (data || []) as NewsItem[];
}

export async function getSavedNewsIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('news_saves')
    .select('news_id')
    .eq('user_id', userId);
  if (error) {
    console.error('Failed to load saved news:', error.message);
    return new Set();
  }
  return new Set((data || []).map(r => r.news_id as string));
}

export async function toggleSavedNews(userId: string, newsId: string): Promise<boolean> {
  const { data: deleted } = await supabase
    .from('news_saves')
    .delete()
    .match({ user_id: userId, news_id: newsId })
    .select();
  if (deleted && deleted.length > 0) return false; // was saved, now unsaved
  await supabase.from('news_saves').insert({ user_id: userId, news_id: newsId });
  return true; // now saved
}

/**
 * Pretty-print "ingested 5 hours ago" / "2 days ago" without a date library.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86_400) return `${Math.round(diff / 3600)} hours ago`;
  if (diff < 86_400 * 7) return `${Math.round(diff / 86_400)} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const TAG_COLORS: Record<string, string> = {
  'Model Release': '#e0007a',
  'Research': '#0099cc',
  'Policy': '#7c3aed',
  'Open Source': '#007a4a',
  'NYC Local': '#c05200',
  'Safety': '#b91c1c',
  'Tooling': '#008ab5',
  'Industry': '#7a6090',
};

export function colorForTag(tag: string | null, fallback: string | null = null): string {
  if (tag && TAG_COLORS[tag]) return TAG_COLORS[tag];
  return fallback || '#7c3aed';
}
