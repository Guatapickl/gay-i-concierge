import { addDoc, deleteDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { currentUser } from './firebase/authClient';
import { chunk, col, getRow, listRows, nowIso, payloadOf, ref, rowOf } from './firebase/db';
import type { AgendaSuggestion } from '@/types/supabase';

/** agenda_suggestion_votes doc id — mirrors the Postgres (suggestion_id, user_id) unique key. */
export function suggestionVoteDocId(suggestionId: string, userId: string) {
  return `${suggestionId}_${userId}`;
}

/**
 * Suggestions for a specific event, or (eventId = null) the general
 * "next meeting" pool. Vote counts and the caller's own vote are attached.
 */
export async function getSuggestions(eventId: string | null): Promise<AgendaSuggestion[]> {
  let rows: AgendaSuggestion[];
  let me: string | undefined;
  try {
    const [data, user] = await Promise.all([
      listRows<AgendaSuggestion>(
        'agenda_suggestions',
        where('event_id', '==', eventId ?? null),
        orderBy('created_at', 'asc'),
      ),
      currentUser(),
    ]);
    rows = data;
    me = user?.uid;
  } catch (err) {
    console.error('Error fetching suggestions:', (err as Error).message);
    return [];
  }
  if (rows.length === 0) return [];

  const votes: { suggestion_id: string; user_id: string }[] = [];
  try {
    for (const part of chunk(rows.map(r => r.id))) {
      const snap = await getDocs(query(col('agenda_suggestion_votes'), where('suggestion_id', 'in', part)));
      snap.docs.forEach(d => votes.push(rowOf(d)));
    }
  } catch {
    // vote counts are best-effort
  }
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes) {
    counts.set(v.suggestion_id, (counts.get(v.suggestion_id) || 0) + 1);
    if (me && v.user_id === me) mine.add(v.suggestion_id);
  }
  return rows
    .map(r => ({ ...r, vote_count: counts.get(r.id) || 0, voted_by_me: mine.has(r.id) }))
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
}

export async function addSuggestion(args: {
  eventId: string | null;
  title: string;
  notes: string | null;
}): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  let fullName: string | null = null;
  try {
    const profile = await getRow<{ full_name?: string | null }>('user_profiles', user.uid);
    fullName = profile?.full_name ?? null;
  } catch {
    fullName = null;
  }
  const authorName = fullName || user.email?.split('@')[0] || null;
  try {
    await addDoc(col('agenda_suggestions'), payloadOf({
      event_id: args.eventId,
      user_id: user.uid,
      author_name: authorName,
      title: args.title,
      notes: args.notes,
      status: 'proposed',
      created_at: nowIso(),
    }));
    return true;
  } catch (err) {
    console.error('Failed to add suggestion:', (err as Error).message);
    return false;
  }
}

export async function toggleSuggestionVote(suggestionId: string, currentlyVoted: boolean): Promise<boolean> {
  const user = await currentUser();
  const uid = user?.uid;
  if (!uid) return false;
  const r = ref('agenda_suggestion_votes', suggestionVoteDocId(suggestionId, uid));
  try {
    if (currentlyVoted) {
      await deleteDoc(r);
    } else {
      await setDoc(r, payloadOf({ suggestion_id: suggestionId, user_id: uid, created_at: nowIso() }));
    }
    return true;
  } catch (err) {
    console.error('Failed to toggle suggestion vote:', (err as Error).message);
    return false;
  }
}

export async function setSuggestionStatus(
  suggestionId: string,
  status: AgendaSuggestion['status']
): Promise<boolean> {
  try {
    await updateDoc(ref('agenda_suggestions', suggestionId), { status });
    return true;
  } catch (err) {
    console.error('Failed to update suggestion:', (err as Error).message);
    return false;
  }
}

export async function deleteSuggestion(suggestionId: string): Promise<boolean> {
  try {
    await deleteDoc(ref('agenda_suggestions', suggestionId));
    return true;
  } catch (err) {
    console.error('Failed to delete suggestion:', (err as Error).message);
    return false;
  }
}
