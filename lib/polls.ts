import { addDoc, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase/client';
import { currentUser } from './firebase/authClient';
import { col, getRow, listRows, nowIso, payloadOf, ref } from './firebase/db';
import type { MeetingPoll, MeetingPollOption, MeetingPollVote } from '@/types/supabase';

export type PollWithOptions = MeetingPoll & { options: MeetingPollOption[] };

export type OptionTally = {
  option: MeetingPollOption;
  /** Borda points: n options → 1st choice = n points, last = 1 point. */
  points: number;
  firstChoice: number;
  /** Average rank across voters who ranked it (lower is better). */
  avgRank: number | null;
};

export type PollTally = {
  voters: number;
  ranked: OptionTally[]; // best first
};

/** meeting_poll_votes doc id — mirrors the Postgres (poll_id, user_id, option_id) unique key. */
export function pollVoteDocId(pollId: string, userId: string, optionId: string) {
  return `${pollId}_${userId}_${optionId}`;
}

export async function getOpenPolls(): Promise<MeetingPoll[]> {
  try {
    return await listRows<MeetingPoll>('meeting_polls', where('status', '==', 'open'), orderBy('created_at', 'desc'));
  } catch (err) {
    console.error('Error fetching polls:', (err as Error).message);
    return [];
  }
}

export async function getAllPolls(): Promise<MeetingPoll[]> {
  try {
    return await listRows<MeetingPoll>('meeting_polls', orderBy('created_at', 'desc'));
  } catch (err) {
    console.error('Error fetching polls:', (err as Error).message);
    return [];
  }
}

export async function getPoll(id: string): Promise<PollWithOptions | null> {
  try {
    const [poll, options] = await Promise.all([
      getRow<MeetingPoll>('meeting_polls', id),
      listRows<MeetingPollOption>('meeting_poll_options', where('poll_id', '==', id), orderBy('sort_order', 'asc')),
    ]);
    if (!poll) return null;
    return { ...poll, options };
  } catch (err) {
    console.error('Error fetching poll:', (err as Error).message);
    return null;
  }
}

export async function createPoll(args: {
  title: string;
  description: string | null;
  closesAt: string | null;
  /** ISO datetimes, in the order they should be displayed. */
  optionDatetimes: string[];
}): Promise<string | null> {
  const user = await currentUser();
  const now = nowIso();
  let pollId: string;
  try {
    const d = await addDoc(col('meeting_polls'), payloadOf({
      title: args.title,
      description: args.description,
      status: 'open',
      event_id: null,
      closes_at: args.closesAt,
      created_by: user?.uid ?? null,
      created_at: now,
      updated_at: now,
    }));
    pollId = d.id;
  } catch (err) {
    console.error('Failed to create poll:', (err as Error).message);
    return null;
  }
  try {
    const batch = writeBatch(db);
    args.optionDatetimes.forEach((dt, i) => {
      batch.set(doc(col('meeting_poll_options')), payloadOf({
        poll_id: pollId,
        option_datetime: dt,
        label: null,
        sort_order: i,
      }));
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to create poll options:', (err as Error).message);
    await deleteDoc(ref('meeting_polls', pollId)).catch(() => {});
    return null;
  }
  return pollId;
}

export async function getMyRanking(pollId: string, userId: string): Promise<string[]> {
  try {
    const rows = await listRows<MeetingPollVote>(
      'meeting_poll_votes',
      where('poll_id', '==', pollId),
      where('user_id', '==', userId),
    );
    return rows.sort((a, b) => a.rank - b.rank).map(r => r.option_id);
  } catch {
    return [];
  }
}

/** Replace the caller's ranking with `orderedOptionIds` (best first). */
export async function submitRanking(
  pollId: string,
  userId: string,
  orderedOptionIds: string[]
): Promise<boolean> {
  try {
    const existing = await getDocs(query(
      col('meeting_poll_votes'),
      where('poll_id', '==', pollId),
      where('user_id', '==', userId),
    ));
    if (existing.size > 0) {
      const del = writeBatch(db);
      existing.docs.forEach(d => del.delete(d.ref));
      await del.commit();
    }
  } catch (err) {
    console.error('Failed to clear previous ranking:', (err as Error).message);
    return false;
  }
  try {
    const batch = writeBatch(db);
    const created_at = nowIso();
    orderedOptionIds.forEach((option_id, i) => {
      batch.set(ref('meeting_poll_votes', pollVoteDocId(pollId, userId, option_id)), payloadOf({
        poll_id: pollId,
        option_id,
        user_id: userId,
        rank: i + 1,
        created_at,
      }));
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Failed to submit ranking:', (err as Error).message);
    return false;
  }
}

export async function getPollVotes(pollId: string): Promise<MeetingPollVote[]> {
  try {
    return await listRows<MeetingPollVote>('meeting_poll_votes', where('poll_id', '==', pollId));
  } catch (err) {
    console.error('Error fetching votes:', (err as Error).message);
    return [];
  }
}

/** Borda count over the ranked ballots. Ties broken by first-choice count, then earlier date. */
export function tallyPoll(options: MeetingPollOption[], votes: MeetingPollVote[]): PollTally {
  const n = options.length;
  const voters = new Set(votes.map(v => v.user_id)).size;
  const byOption = new Map<string, { points: number; first: number; rankSum: number; rankCount: number }>();
  for (const o of options) byOption.set(o.id, { points: 0, first: 0, rankSum: 0, rankCount: 0 });
  for (const v of votes) {
    const slot = byOption.get(v.option_id);
    if (!slot) continue;
    slot.points += Math.max(0, n - v.rank + 1);
    if (v.rank === 1) slot.first += 1;
    slot.rankSum += v.rank;
    slot.rankCount += 1;
  }
  const ranked: OptionTally[] = options.map(option => {
    const s = byOption.get(option.id)!;
    return {
      option,
      points: s.points,
      firstChoice: s.first,
      avgRank: s.rankCount ? s.rankSum / s.rankCount : null,
    };
  });
  ranked.sort(
    (a, b) =>
      b.points - a.points ||
      b.firstChoice - a.firstChoice ||
      new Date(a.option.option_datetime).getTime() - new Date(b.option.option_datetime).getTime()
  );
  return { voters, ranked };
}

export async function closePoll(pollId: string, eventId: string | null): Promise<boolean> {
  try {
    await updateDoc(ref('meeting_polls', pollId), payloadOf({
      status: 'closed',
      event_id: eventId,
      updated_at: nowIso(),
    }));
    return true;
  } catch (err) {
    console.error('Failed to close poll:', (err as Error).message);
    return false;
  }
}

export function formatOption(o: MeetingPollOption): string {
  const d = new Date(o.option_datetime);
  return (
    o.label ||
    d.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );
}
