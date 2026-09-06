import { describe, it, expect, vi } from 'vitest';

// tallyPoll is pure; stub the Firebase client so importing lib/polls needs no env.
vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
vi.mock('@/lib/firebase/authClient', () => ({ currentUser: async () => null }));
import { tallyPoll, selectPollWinner, mergePollVotes } from '@/lib/polls';
import type { MeetingPollOption, MeetingPollVote } from '@/types/supabase';

const opt = (id: string, dt: string): MeetingPollOption => ({
  id, poll_id: 'p', option_datetime: dt, label: null, sort_order: 0,
});
const vote = (user: string, option: string, rank: number): MeetingPollVote => ({
  id: `${user}-${option}`, poll_id: 'p', option_id: option, user_id: user, rank, created_at: '',
});

describe('tallyPoll', () => {
  const options = [
    opt('sep12', '2026-09-12T23:00:00Z'),
    opt('sep13', '2026-09-13T23:00:00Z'),
    opt('sep19', '2026-09-19T23:00:00Z'),
    opt('sep20', '2026-09-20T23:00:00Z'),
  ];

  it('scores with a Borda count and orders best first', () => {
    const votes = [
      // alice: 19 > 12 > 13 > 20
      vote('alice', 'sep19', 1), vote('alice', 'sep12', 2), vote('alice', 'sep13', 3), vote('alice', 'sep20', 4),
      // bob: 12 > 19 > 20 > 13
      vote('bob', 'sep12', 1), vote('bob', 'sep19', 2), vote('bob', 'sep20', 3), vote('bob', 'sep13', 4),
      // carol: 19 > 20 > 12 > 13
      vote('carol', 'sep19', 1), vote('carol', 'sep20', 2), vote('carol', 'sep12', 3), vote('carol', 'sep13', 4),
    ];
    const t = tallyPoll(options, votes);
    expect(t.voters).toBe(3);
    expect(t.ranked.map(r => r.option.id)).toEqual(['sep19', 'sep12', 'sep20', 'sep13']);
    expect(t.ranked[0].points).toBe(4 + 3 + 4); // 11
    expect(t.ranked[0].firstChoice).toBe(2);
    expect(t.ranked[3].avgRank).toBeCloseTo((3 + 4 + 4) / 3);
  });

  it('keeps tied scores for an owner decision', () => {
    const two = [opt('a', '2026-09-20T00:00:00Z'), opt('b', '2026-09-12T00:00:00Z')];
    // 1 voter each way → 3 points each. Earlier date sorts first but does not win.
    const votes = [vote('x', 'a', 1), vote('x', 'b', 2), vote('y', 'b', 1), vote('y', 'a', 2)];
    expect(selectPollWinner(tallyPoll(two, votes))).toEqual({ status: 'tie', optionIds: ['b', 'a'] });
  });

  it('does not use first-choice counts to resolve equal points', () => {
    const t = tallyPoll(options, [vote('x', 'sep12', 1), vote('y', 'sep19', 3), vote('z', 'sep19', 3)]);
    expect(t.ranked.find(r => r.option.id === 'sep12')?.firstChoice).toBe(1);
    expect(t.ranked.find(r => r.option.id === 'sep19')?.firstChoice).toBe(0);
    expect(selectPollWinner(t)).toEqual({ status: 'tie', optionIds: ['sep12', 'sep19'] });
  });

  it('handles no votes', () => {
    const t = tallyPoll(options, []);
    expect(t.voters).toBe(0);
    expect(t.ranked.every(r => r.points === 0 && r.avgRank === null)).toBe(true);
  });
});


describe('explicit availability', () => {
  const options = [opt('a', '2026-09-12T00:00:00Z'), opt('b', '2026-09-20T00:00:00Z')];
  it('supersedes legacy votes for a new ballot and counts all-unavailable respondents', () => {
    const merged = mergePollVotes([vote('x', 'a', 1), vote('y', 'b', 1)], [{
      id: 'ballot', poll_id: 'p', user_id: 'x', available_option_ids: [], unavailable_option_ids: ['a', 'b'], created_at: '', updated_at: '',
    }]);
    const t = tallyPoll(options, merged);
    expect(t.voters).toBe(2);
    expect(t.ranked.find(r => r.option.id === 'a')).toMatchObject({ points: 0, available: 0, unavailable: 1, unanswered: 1 });
    expect(t.ranked.find(r => r.option.id === 'b')).toMatchObject({ points: 2, available: 1, unavailable: 1, unanswered: 0 });
    expect(selectPollWinner(t)).toEqual({ status: 'winner', optionIds: ['b'] });
    expect(selectPollWinner(t, ['a'])).toEqual({ status: 'no_available_dates', optionIds: [] });
  });
  it('does not award points for unavailable or invalid ranks', () => {
    const t = tallyPoll(options, [{ ...vote('x', 'a', 1), available: false }, vote('y', 'a', 0), vote('z', 'b', 1.5)]);
    expect(t.ranked.every(r => r.points === 0)).toBe(true);
  });
  it('does not select malformed available responses with no valid ranked points', () => {
    const t = tallyPoll(options, [{ ...vote('x', 'a', 1), rank: null, available: true }]);
    expect(selectPollWinner(t)).toEqual({ status: 'no_available_dates', optionIds: [] });
  });
  it('distinguishes no respondents from no availability', () => {
    expect(selectPollWinner(tallyPoll(options, []))).toEqual({ status: 'no_responses', optionIds: [] });
    expect(selectPollWinner(tallyPoll(options, [{ ...vote('x', 'a', 1), available: false }]))).toEqual({ status: 'no_available_dates', optionIds: [] });
  });
});
