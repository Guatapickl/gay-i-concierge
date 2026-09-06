import { expect, it } from 'vitest';
import { pollResultEmail } from '../lib/emailTemplates';
it('keeps private meeting details out of subscriber result broadcasts', () => {
  const result = pollResultEmail({ id: 'poll', title: 'Date poll', description: null, closes_at: null }, {
    id: 'meeting', title: 'Club meeting', description: 'Private entry instructions', location: 'Private address fixture', event_datetime: '2026-09-19T19:00:00Z', created_at: '2026-09-06T12:00:00Z',
  });
  for (const output of [result.html, result.text]) {
    expect(output).not.toContain('Private address fixture');
    expect(output).not.toContain('Private entry instructions');
    expect(output).toContain('Sign in to view the meeting location');
    expect(output).toContain('/events/meeting');
  }
});
