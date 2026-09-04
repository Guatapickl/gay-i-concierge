import { deleteDoc, getDoc, limit as qLimit, orderBy, setDoc, where } from 'firebase/firestore';
import { listRows, nowIso, payloadOf, ref, toIso } from './firebase/db';
import type { NewsItem } from '@/types/supabase';

/** news_saves doc id — mirrors the Postgres (news_id, user_id) unique key. */
export function newsSaveDocId(newsId: string, userId: string) {
  return `${newsId}_${userId}`;
}

export async function getNewsItems(limit = 60): Promise<NewsItem[]> {
  try {
    // Firestore sorts nulls first ascending → last when descending, matching nullsFirst:false.
    const rows = await listRows<NewsItem & { ingested_at: unknown }>(
      'news_items',
      orderBy('published_at', 'desc'),
      orderBy('ingested_at', 'desc'),
      qLimit(limit),
    );
    return rows.map(r => ({ ...r, ingested_at: toIso(r.ingested_at) ?? '' }));
  } catch (err) {
    console.error('Failed to load news items:', (err as Error).message);
    return [];
  }
}

export async function getSavedNewsIds(userId: string): Promise<Set<string>> {
  try {
    const rows = await listRows<{ news_id: string }>('news_saves', where('user_id', '==', userId));
    return new Set(rows.map(r => r.news_id));
  } catch (err) {
    console.error('Failed to load saved news:', (err as Error).message);
    return new Set();
  }
}

export async function toggleSavedNews(userId: string, newsId: string): Promise<boolean> {
  const r = ref('news_saves', newsSaveDocId(newsId, userId));
  const snap = await getDoc(r);
  if (snap.exists()) {
    await deleteDoc(r);
    return false; // was saved, now unsaved
  }
  await setDoc(r, payloadOf({ user_id: userId, news_id: newsId, created_at: nowIso() }));
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
