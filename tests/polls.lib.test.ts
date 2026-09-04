import { describe, it, expect, vi } from 'vitest';

// tallyPoll is pure; stub the supabase client so importing lib/polls needs no env.
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
import { tallyPoll } from '@/lib/polls';
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

  it('breaks point ties by first-choice count, then earlier date', () => {
    const two = [opt('a', '2026-09-20T00:00:00Z'), opt('b', '2026-09-12T00:00:00Z')];
    // 1 voter each way → 3 points each, 1 first choice each → earlier date (b) wins
    const votes = [vote('x', 'a', 1), vote('x', 'b', 2), vote('y', 'b', 1), vote('y', 'a', 2)];
    expect(tallyPoll(two, votes).ranked[0].option.id).toBe('b');
  });

  it('handles no votes', () => {
    const t = tallyPoll(options, []);
    expect(t.voters).toBe(0);
    expect(t.ranked.every(r => r.points === 0 && r.avgRank === null)).toBe(true);
  });
});
