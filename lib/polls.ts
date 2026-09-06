import { addDoc, deleteDoc, doc, orderBy, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase/client';
import { authHeader, currentUser } from './firebase/authClient';
import { col, getRow, listRows, nowIso, payloadOf, ref } from './firebase/db';
import type { MeetingPoll, MeetingPollOption, MeetingPollVote, MeetingPollBallot } from '@/types/supabase';

export type PollWithOptions = MeetingPoll & { options: MeetingPollOption[] };

export { tallyPoll, selectPollWinner, mergePollVotes } from './poll-tally';
export type { PollTally, OptionTally, PollWinner } from './poll-tally';
import { mergePollVotes } from './poll-tally';

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
      auto_schedule: true,
      opened_at: now,
      closes_at: args.closesAt || new Date(Date.parse(now) + 7 * 86400000).toISOString(),
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

export type MyBallot = { availableOptionIds: string[]; unavailableOptionIds: string[] };

export async function getMyBallot(pollId: string, userId: string): Promise<MyBallot | null> {
  const ballots = await listRows<MeetingPollBallot>('meeting_poll_ballots', where('poll_id', '==', pollId), where('user_id', '==', userId));
  const ballot = ballots.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (ballot) return { availableOptionIds: ballot.available_option_ids, unavailableOptionIds: ballot.unavailable_option_ids };
  const legacy = await listRows<MeetingPollVote>('meeting_poll_votes', where('poll_id', '==', pollId), where('user_id', '==', userId));
  if (!legacy.length) return null;
  return { availableOptionIds: legacy.filter(v => v.available !== false && v.rank !== null).sort((a, b) => a.rank! - b.rank!).map(v => v.option_id), unavailableOptionIds: [] };
}

export async function getMyRanking(pollId: string, userId: string): Promise<string[]> {
  return (await getMyBallot(pollId, userId))?.availableOptionIds ?? [];
}

/** The server replaces the whole ballot atomically; a failed save preserves the prior ballot. */
export async function submitBallot(pollId: string, ballot: MyBallot): Promise<void> {
  const response = await fetch(`/api/polls/${encodeURIComponent(pollId)}/ballot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(ballot),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not save your availability. Please try again.');
  }
}

export async function getPollVotes(pollId: string): Promise<MeetingPollVote[]> {
  const [legacy, ballots] = await Promise.all([
    listRows<MeetingPollVote>('meeting_poll_votes', where('poll_id', '==', pollId)),
    listRows<MeetingPollBallot>('meeting_poll_ballots', where('poll_id', '==', pollId)),
  ]);
  return mergePollVotes(legacy, ballots);
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
