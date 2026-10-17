import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import NextMeetingRsvps, { attendeeLabel, type RsvpViewState } from '@/components/NextMeetingRsvps';
import type { NextMeetingRsvps as Data } from '@/lib/rsvp';

// The reminder panel's client reaches Firebase Auth at import time; static
// markup never runs its effects, so a stub keeps this test free of Firebase.
vi.mock('@/lib/meetingReminderClient', () => ({
  requestMeetingReminder: vi.fn(),
  MeetingReminderClientError: class extends Error {},
}));

const meeting = { id: 'poll-next', title: 'Gay I Club Meeting', event_datetime: '2099-09-13T22:30:00.000Z', location: 'The usual place' };
const later = { id: 'later', title: 'October meetup', event_datetime: '2099-10-11T22:30:00.000Z', location: null };
const base: Data = { event: meeting, is_next_meeting: true, upcoming_events: [meeting], count: 0, attendees: [], generated_at: '2099-09-13T12:00:00.000Z' };
const render = (state: RsvpViewState) => renderToStaticMarkup(<NextMeetingRsvps state={state} />);

describe('NextMeetingRsvps', () => {
  it('renders loading, signed-out, forbidden and error states distinctly', () => {
    expect(render({ status: 'loading' })).toContain('Loading RSVPs');
    expect(render({ status: 'signed-out' })).toContain('Sign in to see RSVPs');
    const forbidden = render({ status: 'forbidden' });
    expect(forbidden).toContain('Organizers only');
    expect(forbidden).not.toContain('No RSVPs yet');
    const error = render({ status: 'error', message: 'Request failed (HTTP 500).' });
    expect(error).toContain('load RSVPs: Request failed (HTTP 500).');
    expect(error).toContain('not a zero-RSVP result');
    expect(error).toContain('Retry');
    expect(error).not.toContain('No RSVPs yet');
    expect(error).not.toContain('0 RSVPs');
  });

  it('tells "no upcoming meeting" apart from "meeting with zero RSVPs"', () => {
    const none = render({ status: 'ready', data: { ...base, event: null, is_next_meeting: false, upcoming_events: [] } });
    expect(none).toContain('No upcoming meeting');
    expect(none).toContain('data-state="no-upcoming-meeting"');
    expect(none).not.toContain('No RSVPs yet');

    const zero = render({ status: 'ready', data: base });
    expect(zero).toContain('Gay I Club Meeting');
    expect(zero).toContain('Next meeting');
    expect(zero).toContain('0 RSVPs');
    expect(zero).toContain('No RSVPs yet');
    expect(zero).toContain('data-state="zero-rsvps"');
    expect(zero).toContain('Email members a reminder');
    expect(none).not.toContain('Email members a reminder');
    expect(zero).not.toContain('No upcoming meeting');
    expect(zero).not.toContain('<select');
  });

  it('lists attendees with a headcount, meeting date and name fallbacks', () => {
    const html = render({ status: 'ready', data: { ...base, count: 3, attendees: [
      { id: 'a', profile_id: 'uid-a', name: 'Robert Washko', email: null, rsvped_at: '2099-09-11T18:05:56.000Z' },
      { id: 'b', profile_id: 'uid-b', name: null, email: 'member@example.com', rsvped_at: '2099-09-11T18:00:54.000Z' },
      { id: 'c', profile_id: 'uid-c', name: null, email: null, rsvped_at: null },
    ] } });
    expect(html).toContain('3 RSVPs');
    expect(html).toContain('Robert Washko');
    expect(html).toContain('member@example.com');
    expect(html).toContain('sign-in email is shown');
    expect(html).toContain('Member without a name on file');
    expect(html).toContain('Account ID uid-c');
    expect(html).toContain('time not recorded');
    expect(html).toContain('The usual place');
    expect(html).toMatch(/September 13, 2099/);
    expect(html).toContain('href="/events/poll-next"');
    expect(html).toContain('data-state="attendees"');
    expect(html).not.toContain('No RSVPs yet');
  });

  it('offers an event selector when more than one meeting is upcoming and labels a non-next selection', () => {
    const html = render({ status: 'ready', data: { ...base, event: later, is_next_meeting: false, upcoming_events: [meeting, later] } });
    expect(html).toContain('<select');
    expect(html).toContain('Next meeting: Gay I Club Meeting');
    expect(html).toContain('Selected event');
    expect(html).not.toContain('>Next meeting<');
  });

  it('never shows an email next to a name', () => {
    expect(attendeeLabel({ id: 'x', profile_id: 'p', name: 'Named', email: 'leak@example.com', rsvped_at: null })).toEqual({ primary: 'Named', note: null });
  });
});
