import { describe, expect, it } from 'vitest';
import { isPollOpen, newYorkMeetingTime, newYorkDate } from '@/lib/poll-scheduling';

describe('New York meeting booking', () => {
  it('uses the correct summer and winter offsets independently of browser timezone', () => {
    expect(newYorkMeetingTime('2026-09-12', '15:00')).toBe('2026-09-12T19:00:00.000Z');
    expect(newYorkMeetingTime('2026-12-12', '15:00')).toBe('2026-12-12T20:00:00.000Z');
  });
  it('gets the poll date in New York even near UTC midnight', () => {
    expect(newYorkDate('2026-09-13T01:00:00Z')).toBe('2026-09-12');
  });
  it('rejects impossible dates and missing times instead of silently changing them', () => {
    expect(() => newYorkMeetingTime('2026-02-30', '15:00')).toThrow();
    expect(() => newYorkMeetingTime('2026-09-12', '')).toThrow();
    expect(() => newYorkMeetingTime('2026-09-12', '24:00')).toThrow();
  });
  it('rejects the spring gap and fall overlap; normal times on both transition days work', () => {
    expect(() => newYorkMeetingTime('2026-03-08', '02:30')).toThrow(/does not exist/);
    expect(() => newYorkMeetingTime('2026-11-01', '01:30')).toThrow(/occurs twice/);
    expect(newYorkMeetingTime('2026-03-08', '03:30')).toBe('2026-03-08T07:30:00.000Z');
    expect(newYorkMeetingTime('2026-11-01', '02:30')).toBe('2026-11-01T07:30:00.000Z');
  });
});

describe('poll voting deadline', () => {
  const deadline = '2026-09-13T13:00:00Z';
  it('closes exactly at the deadline even when status still says open', () => {
    const poll = { status: 'open', closes_at: deadline };
    expect(isPollOpen(poll, Date.parse(deadline) - 1)).toBe(true);
    expect(isPollOpen(poll, Date.parse(deadline))).toBe(false);
  });
  it('respects manual closure and open polls without deadlines, and fails closed for invalid deadlines', () => {
    expect(isPollOpen({ status: 'closed', closes_at: null })).toBe(false);
    expect(isPollOpen({ status: 'open', closes_at: null })).toBe(true);
    expect(isPollOpen({ status: 'open', closes_at: 'invalid' })).toBe(false);
  });
});
