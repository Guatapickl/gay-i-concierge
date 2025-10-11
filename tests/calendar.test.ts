import { describe, it, expect } from 'vitest';
import { buildICS, googleCalendarUrl } from '@/lib/calendar';

const sample = {
  id: 'evt1',
  title: 'AI Mixer',
  description: 'Meet and mingle with AI folks',
  event_datetime: new Date('2030-01-01T18:00:00Z').toISOString(),
  location: 'Main Hall',
  created_at: new Date().toISOString(),
};

describe('calendar helpers', () => {
  it('builds ICS content', () => {
    const ics = buildICS(sample as any);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:AI Mixer');
    expect(ics).toContain('LOCATION:Main Hall');
    expect(ics).toContain('END:VEVENT');
  });

  it('builds Google Calendar URL', () => {
    const url = googleCalendarUrl(sample as any);
    expect(url).toMatch(/^https:\/\/www\.google\.com\/calendar\/render\?/);
    expect(url).toContain('text=AI+Mixer');
  });
});
