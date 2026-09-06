import { createHash } from 'node:crypto';
import { adminDb } from './firebase/admin';
import { adminPayloadOf, adminRowOf } from './firebase/adminDb';
import { isPollOpen } from './poll-scheduling';
import type { MeetingPoll } from '@/types/supabase';

export class PollActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function ballotDocId(pollId: string, userId: string) {
  return createHash('sha256').update(JSON.stringify([pollId, userId])).digest('hex');
}
export function validateBallot(optionIds: string[], input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PollActionError('Choose your availability for every date.');
  const { availableOptionIds, unavailableOptionIds } = input as Record<string, unknown>;
  if (!Array.isArray(availableOptionIds) || !Array.isArray(unavailableOptionIds)) throw new PollActionError('Choose your availability for every date.');
  const all = [...availableOptionIds, ...unavailableOptionIds];
  if (!optionIds.length || all.length !== optionIds.length || new Set(all).size !== all.length || all.some(id => typeof id !== 'string' || !optionIds.includes(id))) throw new PollActionError('Rank each date you can attend or mark it unavailable.');
  return { availableOptionIds: availableOptionIds as string[], unavailableOptionIds: unavailableOptionIds as string[] };
}
export async function savePollBallot(pollId: string, userId: string, input: unknown, now = new Date()) {
  const db = adminDb();
  const pollRef = db.collection('meeting_polls').doc(pollId);
  const ballotRef = db.collection('meeting_poll_ballots').doc(ballotDocId(pollId, userId));
  await db.runTransaction(async tx => {
    const [pollSnap, options, existing] = await Promise.all([tx.get(pollRef), tx.get(db.collection('meeting_poll_options').where('poll_id', '==', pollId)), tx.get(ballotRef)]);
    if (!pollSnap.exists) throw new PollActionError('Poll not found.', 404);
    const poll = adminRowOf<MeetingPoll>(pollSnap);
    if (!isPollOpen(poll, now.getTime())) throw new PollActionError('Voting has closed. Your previous response has been kept.', 409);
    const ballot = validateBallot(options.docs.map(d => d.id), input);
    tx.set(ballotRef, adminPayloadOf({ poll_id: pollId, user_id: userId, available_option_ids: ballot.availableOptionIds, unavailable_option_ids: ballot.unavailableOptionIds, created_at: existing.data()?.created_at ?? now.toISOString(), updated_at: now.toISOString() }));
    // Serialize ballot submissions with close/booking transactions on the poll.
    tx.update(pollRef, { ballot_revision: Number(pollSnap.data()?.ballot_revision || 0) + 1 });
  });
  return { ok: true };
}
