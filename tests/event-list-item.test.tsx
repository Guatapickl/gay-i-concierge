import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EventListItem from '@/components/EventListItem';
import type { Event } from '@/types/supabase';

const sampleEvent: Event = {
  id: 'event-1',
  title: 'Member Mixer',
  description: 'A casual meetup for club members.',
  event_datetime: '2030-01-15T23:30:00.000Z',
  location: 'Community Hall',
  created_at: '2029-12-01T00:00:00.000Z',
};

describe('EventListItem', () => {
  it('displays event date, time, description, and an RSVP action', () => {
    const html = renderToStaticMarkup(
      <EventListItem event={sampleEvent} onRsvp={() => {}} />,
    );

    expect(html).toContain('Member Mixer');
    expect(html).toContain('A casual meetup for club members.');
    expect(html).toContain('Tue, Jan 15');
    expect(html).toMatch(/6:30\s*PM/);
    expect(html).toContain('RSVP');
  });

  it('shows a disabled saving state while an RSVP update is pending', () => {
    const html = renderToStaticMarkup(
      <EventListItem event={sampleEvent} onRsvp={() => {}} isRsvpPending />,
    );

    expect(html).toContain('Saving');
    expect(html).toContain('disabled=""');
  });
});
