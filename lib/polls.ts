import { supabase } from './supabase';
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

export async function getOpenPolls(): Promise<MeetingPoll[]> {
  const { data, error } = await supabase
    .from('meeting_polls')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching polls:', error.message);
    return [];
  }
  return (data || []) as MeetingPoll[];
}

export async function getAllPolls(): Promise<MeetingPoll[]> {
  const { data, error } = await supabase
    .from('meeting_polls')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching polls:', error.message);
    return [];
  }
  return (data || []) as MeetingPoll[];
}

export async function getPoll(id: string): Promise<PollWithOptions | null> {
  const [{ data: poll, error }, { data: options }] = await Promise.all([
    supabase.from('meeting_polls').select('*').eq('id', id).single(),
    supabase
      .from('meeting_poll_options')
      .select('*')
      .eq('poll_id', id)
      .order('sort_order', { ascending: true }),
  ]);
  if (error || !poll) {
    if (error) console.error('Error fetching poll:', error.message);
    return null;
  }
  return { ...(poll as MeetingPoll), options: (options || []) as MeetingPollOption[] };
}

export async function createPoll(args: {
  title: string;
  description: string | null;
  closesAt: string | null;
  /** ISO datetimes, in the order they should be displayed. */
  optionDatetimes: string[];
}): Promise<string | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const { data: poll, error } = await supabase
    .from('meeting_polls')
    .insert({
      title: args.title,
      description: args.description,
      closes_at: args.closesAt,
      created_by: userRes.user?.id ?? null,
    })
    .select('id')
    .single();
  if (error || !poll) {
    console.error('Failed to create poll:', error?.message);
    return null;
  }
  const rows = args.optionDatetimes.map((dt, i) => ({
    poll_id: poll.id as string,
    option_datetime: dt,
    sort_order: i,
  }));
  const { error: optErr } = await supabase.from('meeting_poll_options').insert(rows);
  if (optErr) {
    console.error('Failed to create poll options:', optErr.message);
    await supabase.from('meeting_polls').delete().eq('id', poll.id);
    return null;
  }
  return poll.id as string;
}

export async function getMyRanking(pollId: string, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('meeting_poll_votes')
    .select('option_id, rank')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .order('rank', { ascending: true });
  return (data || []).map(r => r.option_id as string);
}

/** Replace the caller's ranking with `orderedOptionIds` (best first). */
export async function submitRanking(
  pollId: string,
  userId: string,
  orderedOptionIds: string[]
): Promise<boolean> {
  const { error: delErr } = await supabase
    .from('meeting_poll_votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('user_id', userId);
  if (delErr) {
    console.error('Failed to clear previous ranking:', delErr.message);
    return false;
  }
  const rows = orderedOptionIds.map((option_id, i) => ({
    poll_id: pollId,
    option_id,
    user_id: userId,
    rank: i + 1,
  }));
  const { error } = await supabase.from('meeting_poll_votes').insert(rows);
  if (error) {
    console.error('Failed to submit ranking:', error.message);
    return false;
  }
  return true;
}

export async function getPollVotes(pollId: string): Promise<MeetingPollVote[]> {
  const { data, error } = await supabase
    .from('meeting_poll_votes')
    .select('*')
    .eq('poll_id', pollId);
  if (error) {
    console.error('Error fetching votes:', error.message);
    return [];
  }
  return (data || []) as MeetingPollVote[];
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
  const { error } = await supabase
    .from('meeting_polls')
    .update({ status: 'closed', event_id: eventId })
    .eq('id', pollId);
  if (error) {
    console.error('Failed to close poll:', error.message);
    return false;
  }
  return true;
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
