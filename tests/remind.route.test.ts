import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const fake = vi.hoisted(() => ({
  user: null as { uid: string; email: string | null } | null,
  admins: new Set<string>(),
  userFromRequest: vi.fn(async () => fake.user),
  isAdminUid: vi.fn(async (uid: string) => fake.admins.has(uid)),
  sendMeetingReminder: vi.fn(),
  processDueReminders: vi.fn(async () => ({ attempted: 2, sent: 2, failed: 0 })),
}));

vi.mock('@/lib/firebase/admin', () => ({
  userFromRequest: fake.userFromRequest,
  isAdminUid: fake.isAdminUid,
  adminDb: vi.fn(),
  adminAuth: vi.fn(),
}));
vi.mock('@/lib/meetingReminders', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/meetingReminders')>();
  return { ...actual, sendMeetingReminder: fake.sendMeetingReminder };
});
vi.mock('@/lib/reminders', () => ({ processDueReminders: fake.processDueReminders }));

import { POST } from '@/app/api/events/remind/route';
import { MeetingReminderError } from '@/lib/meetingReminders';

const ORGANIZER = 'organizer-uid';
const MEMBER = 'member-uid';
const planned = (overrides: Record<string, unknown> = {}) => ({
  event: { id: 'ev-next', title: 'Gay I Club Meeting', event_datetime: '2099-09-13T22:30:00.000Z', location: null },
  recipients: [
    { email: 'joey@example.com', user_id: 'u-joey', rsvp_status: 'yes' },
    { email: 'robert@example.com', user_id: 'u-robert', rsvp_status: null },
  ],
  unsubscribed: 1,
  already_reminded: 0,
  unreachable: 0,
  accounts: 3,
  dry_run: false,
  batch_id: 'batch-1',
  queued: 2,
  subject: 'Reminder: Gay I Club Meeting on Sunday, September 13',
  ...overrides,
});

const request = (body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('https://example.test/api/events/remind', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/events/remind', () => {
  const envSecret = process.env.CRON_SECRET;
  beforeEach(() => {
    fake.user = null;
    fake.admins = new Set([ORGANIZER]);
    fake.userFromRequest.mockClear();
    fake.isAdminUid.mockClear();
    fake.sendMeetingReminder.mockReset().mockResolvedValue(planned());
    fake.processDueReminders.mockClear();
    process.env.CRON_SECRET = 'cron-secret-value';
  });
  afterEach(() => {
    if (envSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = envSecret;
  });

  it('rejects anonymous callers without planning anything', async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(401);
    expect(fake.sendMeetingReminder).not.toHaveBeenCalled();
  });

  it('rejects signed-in members who are not organizers', async () => {
    fake.user = { uid: MEMBER, email: 'member@example.com' };
    const res = await POST(request({}));
    expect(res.status).toBe(403);
    expect(fake.sendMeetingReminder).not.toHaveBeenCalled();
  });

  it('accepts the automation secret as a bearer token', async () => {
    const res = await POST(request({ dry_run: true }, { authorization: 'Bearer cron-secret-value' }));
    expect(res.status).toBe(200);
    expect(fake.sendMeetingReminder).toHaveBeenCalledWith(expect.objectContaining({ requestedBy: 'automation', dryRun: true }));
  });

  it('rejects a wrong automation secret', async () => {
    const res = await POST(request({}, { authorization: 'Bearer cron-secret-wrong' }));
    expect(res.status).toBe(401);
  });

  it('queues, drains the queue right away and reports counts without recipient addresses', async () => {
    fake.user = { uid: ORGANIZER, email: 'organizer@example.com' };
    const res = await POST(request({ event_id: ' ev-next ', note: 'Bring a laptop', resend: true }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(fake.sendMeetingReminder).toHaveBeenCalledWith({
      eventId: 'ev-next',
      note: 'Bring a laptop',
      dryRun: false,
      resend: true,
      requestedBy: 'organizer@example.com',
    });
    expect(fake.processDueReminders).toHaveBeenCalledWith(2);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.queued).toBe(2);
    expect(body.recipient_count).toBe(2);
    expect(body.delivery).toEqual({ attempted: 2, sent: 2, failed: 0 });
    expect(JSON.stringify(body)).not.toContain('@example.com');
    expect(body.recipients).toEqual([
      { user_id: 'u-joey', rsvp_status: 'yes' },
      { user_id: 'u-robert', rsvp_status: null },
    ]);
  });

  it('does not touch the queue on a dry run or when nobody is due', async () => {
    fake.user = { uid: ORGANIZER, email: 'organizer@example.com' };
    fake.sendMeetingReminder.mockResolvedValue(planned({ dry_run: true, queued: 0, batch_id: null }));
    const res = await POST(request({ dry_run: true }));
    expect(res.status).toBe(200);
    expect(fake.processDueReminders).not.toHaveBeenCalled();
    expect((await res.json()).delivery).toBeNull();
  });

  it('validates the body', async () => {
    fake.user = { uid: ORGANIZER, email: 'organizer@example.com' };
    expect((await POST(request('{not json'))).status).toBe(400);
    expect((await POST(request({ note: 'x'.repeat(2001) }))).status).toBe(400);
    expect(fake.sendMeetingReminder).not.toHaveBeenCalled();
    // An empty body means "next meeting, no note".
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(fake.sendMeetingReminder).toHaveBeenCalledWith(expect.objectContaining({ eventId: null, note: '' }));
  });

  it('passes planning errors through with their status', async () => {
    fake.user = { uid: ORGANIZER, email: 'organizer@example.com' };
    fake.sendMeetingReminder.mockRejectedValue(new MeetingReminderError('no upcoming meeting to remind about', 404));
    const res = await POST(request({}));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/no upcoming meeting/);
  });
});
