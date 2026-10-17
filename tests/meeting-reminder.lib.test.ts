import { describe, it, expect, beforeEach } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { FakeAdminAuth, FakeAdminDb } from './_fakeAdminDb';
import { planMeetingReminder, sendMeetingReminder, MeetingReminderError, MEETING_REMINDER_KIND } from '@/lib/meetingReminders';
import { meetingReminderEmail } from '@/lib/emailTemplates';
import type { Event } from '@/types/supabase';

const NEXT: Event = {
  id: 'ev-next',
  title: 'Gay I Club Meeting',
  description: 'Robots, demos and dinner.',
  event_datetime: '2099-09-13T22:30:00.000Z',
  location: 'The usual place',
  agenda: [{ title: 'Welcome', time: '6:30' }, { title: 'Demo night' }],
  created_at: '2099-09-01T00:00:00.000Z',
};
const LATER: Event = { ...NEXT, id: 'ev-later', title: 'October meetup', event_datetime: '2099-10-11T22:30:00.000Z', agenda: null };
const PAST: Event = { ...NEXT, id: 'ev-past', title: 'Old meeting', event_datetime: '2001-01-01T00:00:00.000Z' };

const asDocs = (events: Event[]) => events.map(({ id, ...data }) => ({ id, data }));

let db: FakeAdminDb;
let auth: FakeAdminAuth;
const deps = () => ({ db: db as unknown as Firestore, auth: auth as unknown as Auth });

describe('planMeetingReminder', () => {
  beforeEach(() => {
    db = new FakeAdminDb().seed('events', asDocs([LATER, PAST, NEXT]));
    auth = new FakeAdminAuth([
      { uid: 'u-robert', email: 'Robert@Example.com' },
      { uid: 'u-joey', email: 'joey@example.com' },
      { uid: 'u-pedro', email: 'pedro@example.com' },
      { uid: 'u-quiet', email: 'quiet@example.com' },
      { uid: 'u-gone', email: 'gone@example.com', disabled: true },
      { uid: 'u-noemail' },
    ]);
  });

  it('defaults to the next upcoming meeting and includes every enabled account with an email', async () => {
    const { plan, event } = await planMeetingReminder(deps());
    expect(event.id).toBe('ev-next');
    expect(plan.event).toEqual({ id: 'ev-next', title: 'Gay I Club Meeting', event_datetime: NEXT.event_datetime, location: 'The usual place' });
    expect(plan.recipients.map(r => r.email)).toEqual(['joey@example.com', 'pedro@example.com', 'quiet@example.com', 'robert@example.com']);
    expect(plan.accounts).toBe(6);
    expect(plan.unreachable).toBe(2);
    expect(plan.unsubscribed).toBe(0);
    expect(plan.already_reminded).toBe(0);
  });

  it('leaves out members who unsubscribed, keeps members who never opted in or out', async () => {
    db.seed('alerts_subscribers', [
      { id: 's1', data: { email: 'pedro@example.com', email_opt_in: false } },
      { id: 's2', data: { email: 'joey@example.com', email_opt_in: true } },
    ]);
    const { plan } = await planMeetingReminder(deps());
    expect(plan.recipients.map(r => r.email)).toEqual(['joey@example.com', 'quiet@example.com', 'robert@example.com']);
    expect(plan.unsubscribed).toBe(1);
  });

  it('carries each member\'s current answer for the chosen meeting', async () => {
    db.seed('rsvps', [
      { id: 'ev-next_u-joey', data: { event_id: 'ev-next', profile_id: 'u-joey' } },
      { id: 'ev-next_u-quiet', data: { event_id: 'ev-next', profile_id: 'u-quiet', status: 'maybe' } },
      { id: 'ev-next_u-robert', data: { event_id: 'ev-next', profile_id: 'u-robert', status: 'no' } },
      { id: 'ev-later_u-pedro', data: { event_id: 'ev-later', profile_id: 'u-pedro' } },
    ]);
    const { plan } = await planMeetingReminder(deps());
    const byEmail = Object.fromEntries(plan.recipients.map(r => [r.email, r.rsvp_status]));
    expect(byEmail['joey@example.com']).toBe('yes');
    expect(byEmail['quiet@example.com']).toBe('maybe');
    expect(byEmail['robert@example.com']).toBe('no');
    expect(byEmail['pedro@example.com']).toBeNull();
  });

  it('skips members already reminded about this meeting unless resend is requested', async () => {
    db.seed('email_reminders', [
      { id: 'r1', data: { kind: MEETING_REMINDER_KIND, event_id: 'ev-next', recipient_email: 'joey@example.com', status: 'sent' } },
      { id: 'r2', data: { kind: MEETING_REMINDER_KIND, event_id: 'ev-next', recipient_email: 'pedro@example.com', status: 'cancelled' } },
      { id: 'r3', data: { kind: MEETING_REMINDER_KIND, event_id: 'ev-later', recipient_email: 'quiet@example.com', status: 'sent' } },
      { id: 'r4', data: { kind: 'event_reminder', event_id: 'ev-next', recipient_email: 'robert@example.com', status: 'sent' } },
    ]);
    const { plan } = await planMeetingReminder(deps());
    expect(plan.recipients.map(r => r.email)).toEqual(['pedro@example.com', 'quiet@example.com', 'robert@example.com']);
    expect(plan.already_reminded).toBe(1);

    const again = await planMeetingReminder({ ...deps(), resend: true });
    expect(again.plan.recipients).toHaveLength(4);
    expect(again.plan.already_reminded).toBe(0);
  });

  it('reminds about a specific meeting when asked, and reports unknown or missing meetings', async () => {
    const { event } = await planMeetingReminder({ ...deps(), eventId: 'ev-later' });
    expect(event.id).toBe('ev-later');
    await expect(planMeetingReminder({ ...deps(), eventId: 'nope' })).rejects.toMatchObject({ status: 404 });
    db = new FakeAdminDb().seed('events', asDocs([PAST]));
    await expect(planMeetingReminder(deps())).rejects.toBeInstanceOf(MeetingReminderError);
  });
});

describe('sendMeetingReminder', () => {
  beforeEach(() => {
    db = new FakeAdminDb()
      .seed('events', asDocs([NEXT]))
      .seed('rsvps', [{ id: 'ev-next_u-joey', data: { event_id: 'ev-next', profile_id: 'u-joey' } }]);
    auth = new FakeAdminAuth([
      { uid: 'u-robert', email: 'robert@example.com' },
      { uid: 'u-joey', email: 'joey@example.com' },
    ]);
  });

  it('writes nothing on a dry run but still reports the plan and subject', async () => {
    const result = await sendMeetingReminder({ ...deps(), dryRun: true, note: 'Bring a laptop' });
    expect(result.dry_run).toBe(true);
    expect(result.queued).toBe(0);
    expect(result.batch_id).toBeNull();
    expect(result.recipients).toHaveLength(2);
    expect(result.subject).toMatch(/^Reminder: Gay I Club Meeting on /);
    expect(db.rows('email_reminders')).toHaveLength(0);
  });

  it('queues one pending email per recipient, tagged with the batch and the organizer note', async () => {
    const result = await sendMeetingReminder({ ...deps(), note: '  Room changed to 3B  ', requestedBy: 'organizer@example.com' });
    expect(result.queued).toBe(2);
    expect(result.batch_id).toBeTruthy();
    const rows = db.rows('email_reminders');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.data).toMatchObject({
        kind: MEETING_REMINDER_KIND,
        event_id: 'ev-next',
        status: 'pending',
        attempts: 0,
        batch_id: result.batch_id,
        requested_by: 'organizer@example.com',
        note: 'Room changed to 3B',
        subject: result.subject,
      });
      expect(String(row.data.body_html)).toContain('Room changed to 3B');
      expect(String(row.data.body_text)).toContain('Room changed to 3B');
    }
    const joey = rows.find(r => r.data.recipient_email === 'joey@example.com')!;
    const robert = rows.find(r => r.data.recipient_email === 'robert@example.com')!;
    expect(joey.data.recipient_user_id).toBe('u-joey');
    expect(String(joey.data.body_text)).toContain('Your answer so far: Going');
    expect(String(robert.data.body_text)).toContain('Can you make it?');
    expect(String(robert.data.body_text)).toContain('/events/ev-next?rsvp=maybe');
  });

  it('does not queue a second reminder for the same meeting by accident', async () => {
    await sendMeetingReminder(deps());
    const second = await sendMeetingReminder(deps());
    expect(second.queued).toBe(0);
    expect(second.already_reminded).toBe(2);
    expect(db.rows('email_reminders')).toHaveLength(2);
    const third = await sendMeetingReminder({ ...deps(), resend: true });
    expect(third.queued).toBe(2);
    expect(db.rows('email_reminders')).toHaveLength(4);
  });
});

describe('meetingReminderEmail', () => {
  it('carries the meeting details, agenda, note and the account footer, with HTML escaped', () => {
    const { subject, html, text } = meetingReminderEmail(
      { ...NEXT, title: 'Robots & <Friends>' },
      { note: 'Line one\nLine <two>' },
    );
    expect(subject).toBe('Reminder: Robots & <Friends> on Sunday, September 13');
    expect(html).toContain('Robots &amp; &lt;Friends&gt;');
    expect(html).toContain('Line one<br>Line &lt;two&gt;');
    expect(html).toContain('Demo night');
    expect(html).toContain('The usual place');
    expect(html).toContain('have a Gay I Club account');
    expect(html).not.toContain('opted in to club emails');
    expect(html).toContain('/alerts/unsubscribe');
    expect(html).toContain('/events/ev-next?rsvp=yes');
    expect(html).toContain('/events/ev-next?rsvp=maybe');
    expect(html).toContain('/events/ev-next?rsvp=no');
    expect(html).toContain('Can you make it?');
    expect(text).toContain('Line one\nLine <two>');
    expect(text).toContain("- Can't make it: https://gayiclub.com/events/ev-next?rsvp=no");
    expect(text).toContain('- Welcome (6:30)');
    expect(text).toContain('/events/ev-next');
  });

  it('shows the current answer and still offers the other two', () => {
    const { html, text } = meetingReminderEmail(NEXT, { rsvpStatus: 'maybe' });
    expect(html).toContain('Your answer so far: <strong');
    expect(html).toContain('Maybe ✓');
    expect(html).toContain('/events/ev-next?rsvp=no');
    expect(text).toContain('Your answer so far: Maybe.');
  });
});
