import type { MeetingPollBallot, MeetingPollOption, MeetingPollVote } from '@/types/supabase';

export type OptionTally = {
  option: MeetingPollOption;
  points: number;
  firstChoice: number;
  avgRank: number | null;
  available: number;
  unavailable: number;
  /** Missing answers among respondents, not among the entire membership. */
  unanswered: number;
};
export type PollTally = { voters: number; ranked: OptionTally[] };

/** A complete ballot supersedes only that member's legacy votes in that poll. */
export function mergePollVotes(legacy: MeetingPollVote[], ballots: MeetingPollBallot[]): MeetingPollVote[] {
  const key = (poll: string, user: string) => JSON.stringify([poll, user]);
  const latest = new Map<string, MeetingPollBallot>();
  for (const ballot of ballots) {
    const k = key(ballot.poll_id, ballot.user_id);
    const prior = latest.get(k);
    if (!prior || ballot.updated_at > prior.updated_at) latest.set(k, ballot);
  }
  return [
    ...legacy.filter(v => !latest.has(key(v.poll_id, v.user_id))),
    ...[...latest.values()].flatMap(b => [
      ...b.available_option_ids.map((id, i) => ({ id: `${b.id}_${id}`, poll_id: b.poll_id, user_id: b.user_id, option_id: id, available: true, rank: i + 1, created_at: b.created_at })),
      ...b.unavailable_option_ids.map(id => ({ id: `${b.id}_${id}`, poll_id: b.poll_id, user_id: b.user_id, option_id: id, available: false, rank: null, created_at: b.created_at })),
    ]),
  ];
}

export function tallyPoll(options: MeetingPollOption[], votes: MeetingPollVote[]): PollTally {
  const n = options.length;
  const relevant = votes.filter(v => options.some(o => o.id === v.option_id && o.poll_id === v.poll_id));
  const voters = new Set(relevant.map(v => v.user_id)).size;
  const ranked = options.map(option => {
    // Count a member only once for a date, including malformed legacy duplicates.
    const rows = [...new Map(relevant.filter(v => v.option_id === option.id).map(v => [v.user_id, v])).values()];
    const available = rows.filter(v => v.available !== false);
    const ranks = available.map(v => v.rank).filter((r): r is number => r !== null && Number.isInteger(r) && r >= 1 && r <= n);
    return {
      option,
      points: ranks.reduce((sum, rank) => sum + n - rank + 1, 0),
      firstChoice: ranks.filter(r => r === 1).length,
      avgRank: ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null,
      available: available.length,
      unavailable: rows.length - available.length,
      unanswered: voters - rows.length,
    };
  });
  // Date/id ordering is for stable display only; it never resolves a points tie.
  ranked.sort((a, b) => b.points - a.points || a.option.option_datetime.localeCompare(b.option.option_datetime) || a.option.id.localeCompare(b.option.id));
  return { voters, ranked };
}

export type PollWinner = { status: 'winner' | 'tie' | 'no_responses' | 'no_available_dates'; optionIds: string[] };
export function selectPollWinner(tally: PollTally, eligibleOptionIds?: string[]): PollWinner {
  if (!tally.voters) return { status: 'no_responses', optionIds: [] };
  const eligible = tally.ranked.filter(r => r.available > 0 && r.points > 0 && (!eligibleOptionIds || eligibleOptionIds.includes(r.option.id)));
  if (!eligible.length) return { status: 'no_available_dates', optionIds: [] };
  const topPoints = Math.max(...eligible.map(r => r.points));
  const optionIds = eligible.filter(r => r.points === topPoints).map(r => r.option.id);
  return { status: optionIds.length === 1 ? 'winner' : 'tie', optionIds };
}
