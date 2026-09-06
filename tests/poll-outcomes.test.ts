import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminToIso } from '@/lib/firebase/adminDb';
const mocks = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: () => mocks.db, adminAuth: () => ({ getUser: async () => ({ email: 'owner@example.com' }), listUsers: async (_limit: number, pageToken?: string) => pageToken ? ({ users: [{ uid: 'm2' }, { uid: 'disabled', disabled: true }] }) : ({ users: [{ uid: 'owner' }, { uid: 'm1' }], pageToken: 'page2' }) }) }));
import { savePollBallot } from '@/lib/poll-ballots';
import { bookPoll, recordTieOwnerEvent, runPollOutcomes, tieOwnerQuestions } from '@/lib/poll-outcomes';

function memoryDb() {
  const rows = new Map<string, Record<string, unknown>>();
  let pending = Promise.resolve();
  let failurePrefix = '';
  const snapshot = (path: string) => ({ id: path.split('/').at(-1), exists: rows.has(path), ref: doc(path), data: () => rows.get(path) });
  const query = (name: string, field?: string, value?: unknown) => ({ get: async () => ({ docs: [...rows.entries()].filter(([key, data]) => key.split('/').length === name.split('/').length + 1 && key.startsWith(name + '/') && (!field || data[field] === value)).map(([key]) => snapshot(key)) }) });
  const collection = (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`), get: query(name).get, where: (field: string, _operator: string, value: unknown) => query(name, field, value) });
  const doc = (path: string) => ({ path, id: path.split('/').at(-1), collection: (name: string) => collection(`${path}/${name}`), get: async () => snapshot(path) });
  const db = { collection, runTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
    const run = pending.then(async () => {
      const writes: { path: string; data: Record<string, unknown>; create: boolean }[] = [];
      const result = await fn({
        get: async (ref: { get: () => Promise<unknown> }) => { if (writes.length) throw new Error('Read after write'); return ref.get(); },
        create: (ref: { path: string }, data: Record<string, unknown>) => { if (failurePrefix && ref.path.startsWith(failurePrefix)) { failurePrefix = ''; throw new Error('Temporary queue failure'); } writes.push({ path: ref.path, data, create: true }); },
        set: (ref: { path: string }, data: Record<string, unknown>) => writes.push({ path: ref.path, data, create: false }),
        update: (ref: { path: string }, data: Record<string, unknown>) => writes.push({ path: ref.path, data, create: false }),
      });
      if (writes.some(w => w.create && rows.has(w.path))) throw new Error('Already exists');
      for (const w of writes) rows.set(w.path, w.create ? w.data : { ...rows.get(w.path), ...w.data });
      return result;
    });
    pending = run.then(() => undefined, () => undefined);
    return run;
  } };
  return { db, rows, failNext: (prefix: string) => { failurePrefix = prefix; } };
}
let store: ReturnType<typeof memoryDb>;
const now = new Date('2026-09-13T22:00:00Z');
const pollPath = 'meeting_polls/p';
const entries = (name: string) => [...store.rows.entries()].filter(([key]) => key.startsWith(name + '/') && key.split('/').length === 2);
const ballot = (id: string, available: string[], unavailable: string[]) => store.rows.set(`meeting_poll_ballots/${id}`, { poll_id: 'p', user_id: id, available_option_ids: available, unavailable_option_ids: unavailable, created_at: '2026-09-12T22:00:00Z', updated_at: '2026-09-12T22:00:00Z' });
const decisionId = 'tie-p';
const queryId = `hq_auto_${createHash('sha256').update(`gayiclub:${decisionId}`).digest('hex').slice(0, 32)}`;
const answer = (label = 'September 19') => ({ eventId: 'answer-1', queryId, type: 'answered', answers: { winning_date: label } });
beforeEach(() => {
  store = memoryDb(); mocks.db = store.db;
  store.rows.set('meeting_automation_config/default', { enabled: true, ownerUid: 'owner', defaultMeetingTime: '15:00', defaultMeetingLocation: 'Community room' });
  store.rows.set(pollPath, { title: 'September meeting', status: 'open', date_only: true, auto_schedule: true, event_id: null, closes_at: now.toISOString(), created_by: 'owner', created_at: '2026-09-06T22:00:00Z' });
  store.rows.set('meeting_poll_options/a', { poll_id: 'p', option_datetime: '2026-09-19T19:00:00Z', date_only: true, label: 'September 19', sort_order: 0 });
  store.rows.set('meeting_poll_options/b', { poll_id: 'p', option_datetime: '2026-09-26T19:00:00Z', date_only: true, label: 'September 26', sort_order: 1 });
  for (const id of ['owner', 'm1', 'm2']) store.rows.set(`profiles/${id}`, { name: id });
  ballot('m1', ['a', 'b'], []);
});

describe('deadline outcomes', () => {
  it('books and queues the owner report exactly once across overlapping jobs', async () => {
    const results = await Promise.all([runPollOutcomes(now), runPollOutcomes(now)]);
    expect(results.reduce((n, r) => n + r.booked, 0)).toBe(1);
    expect(entries('events')).toHaveLength(1);
    expect(adminToIso(entries('events')[0][1].event_datetime)).toBe('2026-09-19T19:00:00.000Z');
    expect(entries('email_reminders')).toHaveLength(1);
    expect(entries('email_reminders')[0][1].recipient_email).toBe('owner@example.com');
    expect(entries('email_reminders')[0][1].body_text).toContain('Responses: 1 of 3 members; 2 did not respond.');
    expect(store.rows.get(pollPath)?.result_status).toBe('scheduled');
  });
  it('keeps a genuine points tie unresolved regardless of first-choice counts or earliest date', async () => {
    store.rows.set('meeting_poll_options/c', { poll_id: 'p', option_datetime: '2026-09-27T19:00:00Z', label: 'September 27', sort_order: 2 });
    ballot('m1', ['a', 'b', 'c'], []);
    ballot('m2', ['a', 'b', 'c'], []);
    ballot('m3', ['b', 'c', 'a'], []);
    expect((await runPollOutcomes(now)).ties).toBe(1);
    expect(entries('events')).toHaveLength(0);
    expect(store.rows.get(pollPath)?.tie_option_ids).toEqual(['a', 'b']);
    expect(entries('poll_owner_decisions')).toHaveLength(1);
    expect(await tieOwnerQuestions(now)).toHaveLength(1);
  });
  it.each(['no_responses', 'no_available_dates', 'past_dates', 'needs_schedule'])('holds %s without inventing a booking', async outcome => {
    if (outcome === 'no_responses') store.rows.delete('meeting_poll_ballots/m1');
    if (outcome === 'no_available_dates') ballot('m1', [], ['a', 'b']);
    if (outcome === 'past_dates') for (const [, o] of entries('meeting_poll_options')) o.option_datetime = '2026-09-01T19:00:00Z';
    if (outcome === 'needs_schedule') delete store.rows.get('meeting_automation_config/default')!.defaultMeetingTime;
    await runPollOutcomes(now);
    expect(store.rows.get(pollPath)?.result_status).toBe(outcome);
    expect(entries('events')).toHaveLength(0);
    expect(entries('email_reminders')).toHaveLength(1);
  });
  it('uses a future positive winner when a higher-ranked option is already past', async () => {
    store.rows.get('meeting_poll_options/a')!.option_datetime = '2026-09-12T19:00:00Z';
    await runPollOutcomes(now);
    expect(store.rows.get(pollPath)?.selected_option_id).toBe('b');
  });
  it('preserves atomicity on a failed report enqueue and recovers on retry', async () => {
    store.failNext('email_reminders/');
    expect((await runPollOutcomes(now)).errors).toHaveLength(1);
    expect(entries('events')).toHaveLength(0);
    expect(store.rows.get(pollPath)?.report_queued_at).toBeUndefined();
    expect((await runPollOutcomes(now)).booked).toBe(1);
  });
  it('ignores polls before deadline or without automatic processing enabled', async () => {
    expect((await runPollOutcomes(new Date(now.getTime() - 1))).processed).toBe(0);
    store.rows.get(pollPath)!.auto_schedule = false;
    expect((await runPollOutcomes(now)).processed).toBe(0);
  });
  it('reports a previously booked closed poll without creating another event', async () => {
    await bookPoll('p', 'owner', { optionId: 'b' }, new Date(now.getTime() - 1));
    await runPollOutcomes(now);
    expect(entries('events')).toHaveLength(1);
    expect(entries('email_reminders')).toHaveLength(1);
    expect(store.rows.get(pollPath)?.selected_option_id).toBe('b');
  });
  it('counts active Auth members even when profile records are missing', async () => {
    for (const [key] of entries('profiles')) store.rows.delete(key);
    await runPollOutcomes(now);
    expect(entries('email_reminders')[0][1].body_text).toContain('Responses: 1 of 3 members; 2 did not respond.');
  });
  it('honors an explicit disabled configuration', async () => {
    store.rows.get('meeting_automation_config/default')!.enabled = false;
    expect((await runPollOutcomes(now)).processed).toBe(0);
    expect(entries('events')).toHaveLength(0);
  });
  it.each(['invalid_time', 'missing_location'])('holds %s as needs_schedule', async reason => {
    const config = store.rows.get('meeting_automation_config/default')!;
    if (reason === 'invalid_time') config.defaultMeetingTime = 'nonsense';
    else delete config.defaultMeetingLocation;
    await runPollOutcomes(now);
    expect(store.rows.get(pollPath)?.result_status).toBe('needs_schedule');
    expect(entries('events')).toHaveLength(0);
  });
  it('does not book a zero-point malformed legacy preference', async () => {
    store.rows.delete('meeting_poll_ballots/m1');
    store.rows.set('meeting_poll_votes/invalid', { poll_id: 'p', user_id: 'm1', option_id: 'a', rank: 99 });
    await runPollOutcomes(now);
    expect(store.rows.get(pollPath)?.result_status).toBe('no_available_dates');
    expect(entries('events')).toHaveLength(0);
  });
  it('finalizes the newest committed ballot and rejects any later ballot without erasing it', async () => {
    await Promise.all([savePollBallot('p', 'm1', { availableOptionIds: ['b'], unavailableOptionIds: ['a'] }, new Date(now.getTime() - 1)), runPollOutcomes(now)]);
    expect(store.rows.get(pollPath)?.selected_option_id).toBe('b');
    const before = entries('meeting_poll_ballots').map(([key, row]) => [key, JSON.stringify(row)]);
    await expect(savePollBallot('p', 'm1', { availableOptionIds: ['a'], unavailableOptionIds: ['b'] }, now)).rejects.toThrow();
    expect(entries('meeting_poll_ballots').map(([key, row]) => [key, JSON.stringify(row)])).toEqual(before);
  });
  it('lets complete unavailable ballots supersede legacy votes', async () => {
    store.rows.set('meeting_poll_votes/old', { poll_id: 'p', option_id: 'a', user_id: 'm1', rank: 1 });
    ballot('m1', [], ['a', 'b']);
    await runPollOutcomes(now);
    expect(store.rows.get(pollPath)?.result_status).toBe('no_available_dates');
  });
});

describe('owner tie decisions and shared booking', () => {
  const setupTie = async () => { ballot('m2', ['b', 'a'], []); await runPollOutcomes(now); };
  it('accepts answer-before-sent and duplicate callbacks without duplicate events', async () => {
    await setupTie();
    await Promise.all([recordTieOwnerEvent(decisionId, answer(), now), recordTieOwnerEvent(decisionId, answer(), now)]);
    await recordTieOwnerEvent(decisionId, { eventId: 'sent', queryId, type: 'question_sent' }, now);
    expect(entries('events')).toHaveLength(1);
    expect(store.rows.get(`poll_owner_decisions/${decisionId}`)?.state).toBe('resolved');
    expect(await tieOwnerQuestions(now)).toHaveLength(0);
  });
  it('persists unique callback labels when two options share the same display name', async () => {
    store.rows.get('meeting_poll_options/b')!.label = 'September 19';
    await setupTie();
    const questions = await tieOwnerQuestions(now);
    const labels = questions[0].questions[0].options;
    expect(new Set(labels).size).toBe(2);
    await recordTieOwnerEvent(decisionId, answer(labels[1]), now);
    expect(store.rows.get(pollPath)?.selected_option_id).toBe('b');
  });
  it('rejects wrong query bindings, malformed choices, reused event types and expired answers', async () => {
    await setupTie();
    await expect(recordTieOwnerEvent(decisionId, { ...answer(), queryId: 'wrong' }, now)).rejects.toThrow();
    await expect(recordTieOwnerEvent(decisionId, answer('Not a tied date'), now)).rejects.toThrow();
    await recordTieOwnerEvent(decisionId, { eventId: 'sent', queryId, type: 'question_sent' }, now);
    await expect(recordTieOwnerEvent(decisionId, { ...answer(), eventId: 'sent' }, now)).rejects.toThrow();
    await expect(recordTieOwnerEvent(decisionId, answer(), new Date('2026-10-01T22:00:00Z'))).rejects.toThrow();
    expect(entries('events')).toHaveLength(0);
  });
  it('allows only the owner to resolve ties and no-ops a callback after UI resolution', async () => {
    await setupTie();
    await expect(bookPoll('p', 'other-admin', { optionId: 'a' }, now)).rejects.toThrow();
    await bookPoll('p', 'owner', { optionId: 'b' }, now);
    await recordTieOwnerEvent(decisionId, answer(), now);
    expect(entries('events')).toHaveLength(1);
    expect(store.rows.get(pollPath)?.selected_option_id).toBe('b');
  });
  it('keeps missing-default answers pending until configuration is supplied', async () => {
    await setupTie();
    delete store.rows.get('meeting_automation_config/default')!.defaultMeetingTime;
    await expect(recordTieOwnerEvent(decisionId, answer(), now)).rejects.toThrow();
    expect(store.rows.get(`poll_owner_decisions/${decisionId}`)?.state).toBe('pending');
    store.rows.get('meeting_automation_config/default')!.defaultMeetingTime = '16:00';
    await recordTieOwnerEvent(decisionId, answer(), now);
    expect(adminToIso(entries('events')[0][1].event_datetime)).toBe('2026-09-19T20:00:00.000Z');
  });
  it('serializes simultaneous manual and automatic booking with the same event ID', async () => {
    await Promise.all([bookPoll('p', 'owner', { optionId: 'b' }, now), runPollOutcomes(now)]);
    expect(entries('events')).toHaveLength(1);
    expect(entries('email_reminders')).toHaveLength(1);
  });
  it('requires the owner even before cron has recorded an automatic poll tie', async () => {
    ballot('m2', ['b', 'a'], []);
    await expect(bookPoll('p', 'other-admin', { optionId: 'a' }, now)).rejects.toThrow();
    expect(entries('events')).toHaveLength(0);
  });
  it('enforces private tie choices even if public result metadata is changed', async () => {
    await setupTie();
    store.rows.get(pollPath)!.result_status = 'needs_schedule';
    store.rows.get(pollPath)!.auto_schedule = false;
    store.rows.get(pollPath)!.tie_option_ids = [];
    await expect(bookPoll('p', 'other-admin', { optionId: 'a' }, now)).rejects.toThrow();
    store.rows.set('meeting_poll_options/c', { poll_id: 'p', option_datetime: '2026-09-27T19:00:00Z', label: 'September 27' });
    await expect(bookPoll('p', 'owner', { optionId: 'c' }, now)).rejects.toThrow();
    await bookPoll('p', 'owner', { optionId: 'a' }, now);
    expect(entries('events')).toHaveLength(1);
  });
  it('rejects a past selected date and missing date-only meeting time', async () => {
    await expect(bookPoll('p', 'owner', { optionId: 'a' }, new Date('2026-10-01T00:00:00Z'))).rejects.toThrow();
    delete store.rows.get('meeting_automation_config/default')!.defaultMeetingTime;
    await expect(bookPoll('p', 'owner', { optionId: 'a' }, now)).rejects.toThrow();
    expect(entries('events')).toHaveLength(0);
  });
});
