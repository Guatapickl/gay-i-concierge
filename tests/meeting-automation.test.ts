import { createHash } from 'node:crypto';
import { adminToIso } from '@/lib/firebase/adminDb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: () => mocks.db, adminAuth: () => ({ getUser: async () => ({ email: 'owner@example.com' }) }) }));
import { recordOwnerEvent, runMeetingAutomation } from '@/lib/meeting-automation';
import { dateQuestionId } from '@/lib/meeting-workflow-dates';

// Atomic staged writes and serialized transactions model Firestore's contract without live writes.
function memoryDb() {
  const rows = new Map<string, Record<string, unknown>>();
  let pending = Promise.resolve();
  let failurePrefix = '';
  const snapshot = (path: string) => ({ id: path.split('/').at(-1), exists: rows.has(path), ref: doc(path), data: () => rows.get(path) });
  const query = (name: string, field?: string, value?: unknown) => ({ get: async () => ({ docs: [...rows.entries()].filter(([key, data]) => key.split('/').length === name.split('/').length + 1 && key.startsWith(name + '/') && (!field || data[field] === value)).map(([key]) => snapshot(key)) }) });
  const collection = (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`), get: query(name).get, where: (field: string, _operator: string, value: unknown) => query(name, field, value) });
  const doc = (path: string) => ({ path, id: path.split('/').at(-1), collection: (name: string) => collection(`${path}/${name}`), get: async () => snapshot(path), update: async (data: Record<string, unknown>) => { rows.set(path, { ...rows.get(path), ...data }); } });
  const db = { collection, runTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
    const run = pending.then(async () => {
      const writes: (() => void)[] = [];
      const result = await fn({
        get: async (ref: { get: () => Promise<unknown> }) => ref.get(),
        create: (ref: { path: string }, data: Record<string, unknown>) => { if (failurePrefix && ref.path.startsWith(failurePrefix)) { failurePrefix = ''; throw new Error('Temporary queue failure'); } writes.push(() => { if (rows.has(ref.path)) throw new Error('Already exists'); rows.set(ref.path, data); }); },
        update: (ref: { path: string }, data: Record<string, unknown>) => writes.push(() => rows.set(ref.path, { ...rows.get(ref.path), ...data })),
      });
      writes.forEach(write => write());
      return result;
    });
    pending = run.then(() => undefined, () => undefined);
    return run;
  } };
  return { db, rows, failNext: (prefix: string) => { failurePrefix = prefix; } };
}
const now = new Date('2026-09-20T15:00:00Z');
const id = 'month-2026-10';
const dates = ['2026-10-03', '2026-10-04'];
const answer = (choices = ['Available', 'Unavailable']) => Object.fromEntries(dates.map((date, index) => [dateQuestionId(date), choices[index]]));
const queryId = `hq_auto_${createHash('sha256').update(`gayiclub:${id}`).digest('hex').slice(0, 32)}`;
const sent = { eventId: 'sent-1', queryId, type: 'question_sent', questionnaireUrl: 'https://example.com/questionnaire' };
const answered = { eventId: 'answer-1', queryId, type: 'answered', answers: answer() };
let store: ReturnType<typeof memoryDb>;
const entries = (name: string) => [...store.rows.entries()].filter(([key]) => key.startsWith(name + '/') && key.split('/').length === 2);
beforeEach(() => {
  store = memoryDb(); mocks.db = store.db;
  store.rows.set(`meeting_automation_requests/${id}`, { targetMonth: '2026-10', dates, state: 'pending', ownerUid: 'owner', expiresAt: '2026-10-03T00:00:00Z' });
  store.rows.set('alerts_subscribers/owner', { user_id: 'owner', email: 'owner@example.com', email_opt_in: true });
  store.rows.set('alerts_subscribers/owner-legacy', { email: ' OWNER@example.com ', email_opt_in: true });
  store.rows.set('alerts_subscribers/member', { user_id: 'member', email: 'member@example.com', email_opt_in: true });
  store.rows.set('alerts_subscribers/opt-out', { user_id: 'opt-out', email: 'optout@example.com', email_opt_in: false });
});

describe('owner-first member polling', () => {
  it('publishes exactly once on concurrent replay and only includes confirmed available days', async () => {
    await recordOwnerEvent(id, sent, now);
    expect(entries('meeting_polls')).toHaveLength(0);
    await Promise.all([recordOwnerEvent(id, answered, now), recordOwnerEvent(id, answered, now)]);
    expect(entries('meeting_polls')).toHaveLength(1);
    expect(entries('meeting_poll_options')).toHaveLength(1);
    expect(entries('meeting_poll_options')[0][1].label).toBe('Saturday, October 3');
    expect(entries('email_reminders')).toHaveLength(1);
    expect(entries('email_reminders')[0][1].recipient_email).toBe('member@example.com');
  });
  it('records none available without creating a poll or invitations', async () => {
    await recordOwnerEvent(id, sent, now);
    await recordOwnerEvent(id, { ...answered, answers: answer(['Unavailable', 'Unavailable']) }, now);
    expect(entries('meeting_polls')).toHaveLength(0);
    expect(entries('email_reminders')).toHaveLength(0);
    expect(store.rows.get(`meeting_automation_requests/${id}`)?.state).toBe('needs_availability');
  });
  it.each([undefined, {}, { date_2026_10_03: 'Available' }, { date_2026_10_03: 'yes', date_2026_10_04: 'Unavailable' }, { date_2026_10_03: ['Available'], date_2026_10_04: 'Unavailable' }])('rejects incomplete or invalid answers without publishing (%j)', async answers => {
    await recordOwnerEvent(id, sent, now);
    await expect(recordOwnerEvent(id, { ...answered, answers }, now)).rejects.toThrow();
    expect(entries('meeting_polls')).toHaveLength(0);
    expect(entries('email_reminders')).toHaveLength(0);
  });
  it('recovers an answer delivered before question_sent and keeps the later binding stable', async () => {
    await recordOwnerEvent(id, answered, now);
    await recordOwnerEvent(id, sent, now);
    expect(entries('meeting_polls')).toHaveLength(1);
    expect(store.rows.get(`meeting_automation_requests/${id}`)?.state).toBe('published');
    await expect(recordOwnerEvent(id, { ...sent, eventId: 'sent-wrong', queryId: 'wrong-query' }, now)).rejects.toThrow();
  });
  it('rejects an unbound questionnaire ID from a different request', async () => {
    await expect(recordOwnerEvent(id, { ...answered, queryId: 'unrelated-questionnaire' }, now)).rejects.toThrow();
    expect(entries('meeting_polls')).toHaveLength(0);
  });
  it('gives later polls a full week even when an offered date is sooner', async () => {
    const winterId = 'month-2026-12';
    const winterDates = ['2026-12-05', '2026-12-06'];
    const winterQuery = `hq_auto_${createHash('sha256').update(`gayiclub:${winterId}`).digest('hex').slice(0, 32)}`;
    store.rows.set(`meeting_automation_requests/${winterId}`, { targetMonth: '2026-12', dates: winterDates, state: 'pending', ownerUid: 'owner', expiresAt: '2026-12-05T00:00:00Z' });
    await recordOwnerEvent(winterId, { ...answered, queryId: winterQuery, answers: Object.fromEntries(winterDates.map(date => [dateQuestionId(date), 'Available'])) }, new Date('2026-12-03T15:00:00Z'));
    expect(adminToIso(entries('meeting_polls')[0][1].closes_at)).toBe('2026-12-10T15:00:00.000Z');
  });
  it('keeps binding stable on retries and rejects a different questionnaire even with a replayed event ID', async () => {
    await recordOwnerEvent(id, sent, now);
    await recordOwnerEvent(id, sent, now);
    await expect(recordOwnerEvent(id, { ...sent, queryId: 'wrong-query' }, now)).rejects.toThrow();
    await expect(recordOwnerEvent(id, { ...answered, queryId: 'wrong-query' }, now)).rejects.toThrow();
    expect(entries('meeting_polls')).toHaveLength(0);
  });
  it('retries notification failures without creating another poll or duplicate invitations', async () => {
    await recordOwnerEvent(id, sent, now);
    store.failNext('email_reminders/');
    await expect(recordOwnerEvent(id, answered, now)).rejects.toThrow('Temporary queue failure');
    expect(entries('meeting_polls')).toHaveLength(1);
    await recordOwnerEvent(id, answered, now);
    await recordOwnerEvent(id, answered, now);
    expect(entries('meeting_polls')).toHaveLength(1);
    expect(entries('email_reminders')).toHaveLength(1);
  });
  it.each(['closed', 'expired'])('skips pending invitation retries for a %s poll', async state => {
    await recordOwnerEvent(id, sent, now);
    store.failNext('email_reminders/');
    await expect(recordOwnerEvent(id, answered, now)).rejects.toThrow('Temporary queue failure');
    const poll = entries('meeting_polls')[0][1];
    if (state === 'closed') poll.status = 'closed';
    else poll.closes_at = '2020-01-01T00:00:00.000Z';
    await recordOwnerEvent(id, answered, now);
    expect(entries('email_reminders')).toHaveLength(0);
    expect(store.rows.get(`meeting_automation_requests/${id}`)?.notificationsQueued).toBe(true);
    expect(store.rows.get(`meeting_automation_requests/${id}`)?.notificationsSkipped).toBe('poll_closed_or_expired');
  });
  it('rejects expired availability and already-started available dates', async () => {
    await recordOwnerEvent(id, sent, now);
    await expect(recordOwnerEvent(id, answered, new Date('2026-10-03T14:00:00Z'))).rejects.toThrow();
    store.rows.get(`meeting_automation_requests/${id}`)!.expiresAt = '2026-10-10T15:00:00Z';
    await expect(recordOwnerEvent(id, answered, new Date('2026-10-03T14:00:00Z'))).rejects.toThrow();
    expect(entries('meeting_polls')).toHaveLength(0);
  });
  it('creates a request after a last-day-of-month meeting using only future weekends', async () => {
    store.rows.delete(`meeting_automation_requests/${id}`);
    store.rows.set('meeting_automation_config/default', { enabled: true, ownerUid: 'owner', activatedAt: '2026-09-06T12:00:00Z' });
    store.rows.set('events/last-day', { event_datetime: '2026-09-30T19:00:00Z' });
    expect((await runMeetingAutomation(new Date('2026-10-01T13:00:00Z'))).created).toBe(1);
    expect(store.rows.get(`meeting_automation_requests/${id}`)?.dates).toContain('2026-10-03');
    expect(entries('meeting_polls')).toHaveLength(0);
  });
  it('does not create owner requests for events before activation and deduplicates qualifying meetings by month', async () => {
    store.rows.delete(`meeting_automation_requests/${id}`);
    store.rows.set('meeting_automation_config/default', { enabled: true, ownerUid: 'owner', activatedAt: '2026-09-06T12:00:00Z' });
    store.rows.set('events/old', { event_datetime: '2026-09-05T19:00:00Z' });
    store.rows.set('events/first', { event_datetime: '2026-09-12T19:00:00Z' });
    store.rows.set('events/second', { event_datetime: '2026-09-13T19:00:00Z' });
    store.rows.set('events/future', { event_datetime: '2026-09-27T19:00:00Z' });
    expect((await runMeetingAutomation(now)).created).toBe(1);
    expect((await runMeetingAutomation(now)).created).toBe(0);
    expect(entries('meeting_automation_requests')).toHaveLength(1);
    expect(entries('meeting_polls')).toHaveLength(0);
    expect(entries('email_reminders')).toHaveLength(0);
  });
});
