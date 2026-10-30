import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeAdminAuth, FakeAdminDb } from './_fakeAdminDb';

const state = vi.hoisted(() => ({
  db: null as unknown as FakeAdminDb,
  auth: null as unknown as FakeAdminAuth,
  user: { uid: 'organizer', email: 'organizer@gmail.com' } as { uid: string; email: string } | null,
  admin: true,
}));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: () => state.db,
  adminAuth: () => state.auth,
  userFromRequest: async () => state.user,
  isAdminUid: async () => state.admin,
}));
import { POST } from '@/app/api/polls/[id]/notify/route';
import { pollInviteEmail } from '@/lib/emailTemplates';

const poll = { id: 'poll-1', title: 'Next meeting', status: 'open', description: null, closes_at: null, event_id: 'event-1' };
const notify = (type = 'invite', authorization = true) => POST(new Request('https://gayiclub.com/api/polls/poll-1/notify', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization: 'Bearer organizer-token' } : {}) }, body: JSON.stringify({ type }),
}), { params: Promise.resolve({ id: poll.id }) });
const queued = () => state.db.rows('email_reminders');

beforeEach(() => {
  state.user = { uid: 'organizer', email: 'organizer@gmail.com' };
  state.admin = true;
  state.db = new FakeAdminDb().seed('meeting_polls', [{ id: poll.id, data: poll }]);
  state.auth = new FakeAdminAuth([
    { uid: 'm1', email: ' Member@gmail.com ' },
    { uid: 'm2', email: 'other@gmail.com' },
    { uid: 'm3', email: 'member@gmail.com' },
    { uid: 'm4', email: 'out@gmail.com' },
    { uid: 'disabled', email: 'disabled@gmail.com', disabled: true },
    { uid: 'no-email' },
    { uid: 'fixture', email: 'codex-auth-signup-check@example.com' },
    { uid: 'example', email: 'someone@example.org' },
  ]);
  state.db.seed('alerts_subscribers', [
    { id: 'out', data: { email: ' OUT@gmail.com ', email_opt_in: false } },
    { id: 'phone-only', data: { user_id: 'm1', email: null, email_opt_in: false } },
  ]);
});

describe('organizer poll notifications', () => {
  it('includes registered accounts without subscriptions, paginates, normalizes, deduplicates, and preserves opt-outs', async () => {
    const subscriptions = structuredClone(state.db.rows('alerts_subscribers'));
    const res = await notify();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ queued: 2 });
    expect(queued().map(r => r.data.recipient_email).sort()).toEqual(['member@gmail.com', 'other@gmail.com']);
    expect(queued().find(r => r.data.recipient_email === 'member@gmail.com')?.data.recipient_user_id).toBe('m1');
    expect(state.db.rows('alerts_subscribers')).toEqual(subscriptions);
  });

  it('skips existing poll and one-time administrative invitations, even when the poll title changed', async () => {
    state.db.seed('email_reminders', [
      { id: 'old', data: { kind: 'poll_invite', recipient_email: 'member@gmail.com', subject: 'Old title', body_text: '[poll:poll-1:poll_invite]', status: 'sent' } },
      { id: 'admin', data: { kind: 'admin_poll_invite', poll_id: 'poll-1', recipient_email: 'other@gmail.com', subject: 'Old title', status: 'sent' } },
    ]);
    expect(await (await notify()).json()).toMatchObject({ queued: 0, skipped: 2 });
    expect(queued()).toHaveLength(2);
  });

  it('queues another poll with the same title and does not queue the current poll twice', async () => {
    state.db.seed('email_reminders', [{ id: 'different-poll', data: {
      kind: 'poll_invite', recipient_email: 'member@gmail.com', subject: `Vote: ${poll.title}`, body_text: '[poll:other-poll:poll_invite]', status: 'sent',
    } }]);
    expect(await (await notify()).json()).toMatchObject({ queued: 2 });
    expect(await (await notify()).json()).toMatchObject({ queued: 0, skipped: 2 });
    expect(queued()).toHaveLength(3);
  });

  it('recognizes automated invitations that have only a deterministic queue ID', async () => {
    const id = createHash('sha256').update('poll-1:poll_invite:member@gmail.com').digest('hex');
    state.db.seed('email_reminders', [{ id, data: {
      kind: 'poll_invite', recipient_email: 'member@gmail.com', subject: 'Original automated poll title', body_text: 'Rank the dates', status: 'sent',
    } }]);
    expect(await (await notify()).json()).toMatchObject({ queued: 1, skipped: 1 });
    expect(queued()).toHaveLength(2);
  });

  it('does not queue duplicates when two organizer requests overlap', async () => {
    const responses = await Promise.all([notify(), notify()]);
    const results = await Promise.all(responses.map(res => res.json()));
    expect(results.reduce((sum, result) => sum + result.queued, 0)).toBe(2);
    expect(queued()).toHaveLength(2);
  });

  it('keeps result emails limited to opted-in subscribers', async () => {
    state.db.seed('alerts_subscribers', [{ id: 'subscribed', data: { email: 'subscriber@gmail.com', user_id: 'sub', email_opt_in: true } }]);
    state.db.seed('events', [{ id: 'event-1', data: { title: 'Meeting', event_datetime: '2099-11-01T18:00:00Z' } }]);
    const listUsers = vi.spyOn(state.auth, 'listUsers');
    expect(await (await notify('result')).json()).toMatchObject({ queued: 1 });
    expect(queued()[0].data).toMatchObject({ kind: 'poll_result', recipient_email: 'subscriber@gmail.com' });
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('requires a signed-in organizer and an open poll', async () => {
    expect((await notify('invite', false)).status).toBe(401);
    state.user = null;
    expect((await notify()).status).toBe(401);
    state.user = { uid: 'member', email: 'member@gmail.com' }; state.admin = false;
    expect((await notify()).status).toBe(403);
    state.admin = true;
    state.db.seed('meeting_polls', [{ id: poll.id, data: { ...poll, status: 'closed' } }]);
    expect((await notify()).status).toBe(400);
    expect(queued()).toHaveLength(0);
  });

  it('explains the account relationship in invitations without claiming an opt-in', () => {
    const email = pollInviteEmail(poll, []);
    expect(email.html).toContain('have a Gay I Club account');
    expect(email.html).not.toContain('opted in to club emails');
    expect(email.html).toContain('/alerts/unsubscribe');
    expect(email.text).toContain('/alerts/unsubscribe');
  });
});
