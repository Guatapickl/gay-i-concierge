import { describe, it, expect } from 'vitest';
import { applyAnswer, countRsvps, isAttending, parseRsvpStatus, rsvpAnswerUrl, rsvpStatusOf } from '@/lib/rsvpStatus';
import { safeNextPath } from '@/lib/safeNextPath';
import { rsvpConfirmationEmail } from '@/lib/emailTemplates';
import type { Event } from '@/types/supabase';

describe('rsvp answers', () => {
  it('parses only the three answers and reads legacy rows as yes', () => {
    expect(parseRsvpStatus('yes')).toBe('yes');
    expect(parseRsvpStatus('maybe')).toBe('maybe');
    expect(parseRsvpStatus('no')).toBe('no');
    expect(parseRsvpStatus('YES')).toBeNull();
    expect(parseRsvpStatus(undefined)).toBeNull();
    expect(rsvpStatusOf({})).toBe('yes');
    expect(rsvpStatusOf({ status: 'no' })).toBe('no');
    expect(rsvpStatusOf({ status: 'garbage' })).toBe('yes');
    expect(rsvpStatusOf(null)).toBeNull();
  });

  it('counts answers and knows who is attending', () => {
    expect(countRsvps([{}, { status: 'maybe' }, { status: 'no' }, { status: 'yes' }])).toEqual({ yes: 2, maybe: 1, no: 1 });
    expect(isAttending('yes')).toBe(true);
    expect(isAttending('maybe')).toBe(true);
    expect(isAttending('no')).toBe(false);
    expect(isAttending(null)).toBe(false);
  });

  it('builds answer links the event page understands', () => {
    expect(rsvpAnswerUrl('https://gayiclub.com/', 'ev 1', 'maybe')).toBe('https://gayiclub.com/events/ev%201?rsvp=maybe');
  });

  it('moves one answer between tallies on the event page', () => {
    const start = { yes: 2, maybe: 1, no: 0 };
    expect(applyAnswer(start, null, 'yes')).toEqual({ yes: 3, maybe: 1, no: 0 });
    expect(applyAnswer(start, 'yes', 'no')).toEqual({ yes: 1, maybe: 1, no: 1 });
    expect(applyAnswer(start, 'maybe', null)).toEqual({ yes: 2, maybe: 0, no: 0 });
    expect(applyAnswer({ yes: 0, maybe: 0, no: 0 }, 'yes', null)).toEqual({ yes: 0, maybe: 0, no: 0 });
  });

  it('only returns to same-site paths after sign-in', () => {
    expect(safeNextPath('/events/ev-1?rsvp=no')).toBe('/events/ev-1?rsvp=no');
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath('https://evil.example/phish')).toBe('/');
    expect(safeNextPath('//evil.example')).toBe('/');
    expect(safeNextPath('/\\evil.example')).toBe('/');
  });

  it('words the confirmation for a maybe differently from a yes', () => {
    const event: Event = { id: 'ev-1', title: 'Meeting', description: null, event_datetime: '2099-09-13T22:30:00.000Z', location: null, created_at: '2099-01-01T00:00:00.000Z' };
    const yes = rsvpConfirmationEmail(event);
    expect(yes.subject).toBe("You're in: Meeting");
    expect(yes.text).toContain("You're on the list");
    const maybe = rsvpConfirmationEmail(event, 'maybe');
    expect(maybe.subject).toBe('Marked as maybe: Meeting');
    expect(maybe.html).toContain('down as a maybe');
    expect(maybe.html).toContain('update your answer');
    expect(maybe.text).toContain('update your answer');
  });
});
