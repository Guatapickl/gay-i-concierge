import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { adminPayloadOf } from '@/lib/firebase/adminDb';

const state = vi.hoisted(() => ({ db: null as unknown, callbacks: 0, transactions: 0 }));
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: () => {
    if (process.env.RUN_FIREBASE_RULES_TESTS !== '1' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Local demo Firestore emulator required.');
    return state.db;
  },
  adminAuth: () => ({ getUser: async (uid: string) => ({ uid, email: 'owner@example.test' }), listUsers: async () => ({ users: [] }) }),
}));
import { bookPoll, pollEventId, recordTieOwnerEvent, runPollOutcomes } from '@/lib/poll-outcomes';
import { ballotDocId, savePollBallot } from '@/lib/poll-ballots';

// Run alone via firebase emulators:exec --project demo-gayiclub --only firestore.
// No blanket collection deletion: every fixture has a unique ID and exact cleanup.
describe.skipIf(process.env.RUN_FIREBASE_RULES_TESTS !== '1')('real Firestore poll transaction concurrency', () => {
  const prefix = `poll-concurrency-${randomUUID()}`;
  const ownerUid = `${prefix}-owner`;
  const member = `${prefix}-member`;
  const deadline = new Date('2035-09-11T22:00:00Z');
  const beforeDeadline = new Date('2035-09-11T21:59:59Z');
  const afterDeadline = new Date('2035-09-11T22:00:01Z');
  const pollIds: string[] = [];
  let app: App;
  let db: Firestore;
  let previousConfig: FirebaseFirestore.DocumentData | undefined;
  beforeAll(async () => {
    if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Refusing tests outside the loopback Firestore emulator.');
    app = initializeApp({ projectId: 'demo-gayiclub' }, prefix);
    db = getFirestore(app);
    // Count actual transaction callback retries while retaining real SDK behavior.
    state.db = new Proxy(db, {
      get(target, key) {
        if (key === 'runTransaction') return (callback: (tx: FirebaseFirestore.Transaction) => Promise<unknown>) => {
          state.transactions++;
          return target.runTransaction(tx => { state.callbacks++; return callback(tx); });
        };
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const config = db.collection('meeting_automation_config').doc('default');
    previousConfig = (await config.get()).data();
    await config.set({ ownerUid, defaultMeetingTime: '19:00', defaultMeetingLocation: 'Emulator test venue' });
  });
  afterAll(async () => {
    if (!db) return;
    for (const pollId of pollIds) {
      for (const collection of ['meeting_poll_options', 'meeting_poll_ballots', 'meeting_poll_votes']) {
        const docs = await db.collection(collection).where('poll_id', '==', pollId).get();
        await Promise.all(docs.docs.map(doc => doc.ref.delete()));
      }
      const decision = db.collection('poll_owner_decisions').doc(`tie-${pollId}`);
      const ledger = await decision.collection('events').get();
      await Promise.all(ledger.docs.map(doc => doc.ref.delete()));
      await Promise.all([
        db.collection('meeting_polls').doc(pollId).delete(), db.collection('events').doc(pollEventId(pollId)).delete(), decision.delete(),
        db.collection('email_reminders').doc(`poll-report-${createHash('sha256').update(pollId).digest('hex')}`).delete(),
      ]);
    }
    const config = db.collection('meeting_automation_config').doc('default');
    if (previousConfig) await config.set(previousConfig); else await config.delete();
    await db.terminate();
    await deleteApp(app);
  });

  async function seed(name: string, tie = false) {
    const pollId = `${prefix}-${name}`;
    pollIds.push(pollId);
    const a = `${pollId}-a`, b = `${pollId}-b`;
    const batch = db.batch();
    batch.set(db.collection('meeting_polls').doc(pollId), adminPayloadOf({ title: `Concurrency ${name}`, status: 'open', auto_schedule: true, date_only: true, closes_at: deadline.toISOString(), created_at: beforeDeadline.toISOString(), event_id: null, ballot_revision: 0 }));
    for (const [index, id] of [a, b].entries()) batch.set(db.collection('meeting_poll_options').doc(id), { poll_id: pollId, option_datetime: `2035-09-${index ? '20' : '19'}T16:00:00Z`, date_only: true, label: index ? 'September 20' : 'September 19', sort_order: index });
    batch.set(db.collection('meeting_poll_ballots').doc(ballotDocId(pollId, member)), adminPayloadOf({ poll_id: pollId, user_id: member, available_option_ids: [a, b], unavailable_option_ids: [], created_at: beforeDeadline.toISOString(), updated_at: beforeDeadline.toISOString() }));
    if (tie) batch.set(db.collection('meeting_poll_ballots').doc(ballotDocId(pollId, `${member}-two`)), adminPayloadOf({ poll_id: pollId, user_id: `${member}-two`, available_option_ids: [b, a], unavailable_option_ids: [], created_at: beforeDeadline.toISOString(), updated_at: beforeDeadline.toISOString() }));
    await batch.commit();
    return { pollId, a, b };
  }
  async function effects(pollId: string) {
    const [events, reports, poll] = await Promise.all([
      db.collection('events').where('source_poll_id', '==', pollId).get(),
      db.collection('email_reminders').doc(`poll-report-${createHash('sha256').update(pollId).digest('hex')}`).get(),
      db.collection('meeting_polls').doc(pollId).get(),
    ]);
    expect(events.size).toBe(1);
    expect(reports.exists).toBe(true);
    expect(reports.data()).toMatchObject({ recipient_email: 'owner@example.test', status: 'pending', kind: 'poll_owner_report' });
    expect(poll.data()).toMatchObject({ status: 'closed', result_status: 'scheduled', event_id: events.docs[0].id });
    return { poll: poll.data()!, report: reports.data()!, event: events.docs[0].data() };
  }

  it('simultaneous deadline jobs create one meeting and queue one owner report', async () => {
    const { pollId, a } = await seed('finalize');
    const results = await Promise.all(Array.from({ length: 6 }, () => runPollOutcomes(afterDeadline)));
    expect(results.flatMap(result => result.errors)).toEqual([]);
    expect(results.reduce((sum, result) => sum + result.booked, 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + result.reportsQueued, 0)).toBe(1);
    expect((await effects(pollId)).poll.selected_option_id).toBe(a);
  }, 60000);

  it('a racing last-second ballot is wholly included or rejected before the report and booking', async () => {
    const { pollId, a, b } = await seed('ballot-race');
    const [ballotResult, finalization] = await Promise.allSettled([
      savePollBallot(pollId, member, { availableOptionIds: [b], unavailableOptionIds: [a] }, beforeDeadline),
      runPollOutcomes(afterDeadline),
    ]);
    expect(finalization.status).toBe('fulfilled');
    if (finalization.status === 'fulfilled') expect(finalization.value.errors).toEqual([]);
    const { poll, report } = await effects(pollId);
    const ballot = (await db.collection('meeting_poll_ballots').doc(ballotDocId(pollId, member)).get()).data()!;
    if (ballotResult.status === 'fulfilled') {
      expect(ballot.available_option_ids).toEqual([b]);
      expect(ballot.unavailable_option_ids).toEqual([a]);
      expect(poll.selected_option_id).toBe(b);
      expect(report.body_text).toContain('September 20');
    } else {
      expect(ballotResult.reason).toMatchObject({ status: 409 });
      expect(ballot.available_option_ids).toEqual([a, b]);
      expect(ballot.unavailable_option_ids).toEqual([]);
      expect(poll.selected_option_id).toBe(a);
    }
  }, 60000);

  it('concurrent duplicate tie callbacks and owner booking converge on one meeting', async () => {
    const { pollId, a, b } = await seed('tie-race', true);
    expect((await runPollOutcomes(afterDeadline)).errors).toEqual([]);
    const id = `tie-${pollId}`;
    const queryId = `hq_auto_${createHash('sha256').update(`gayiclub:${id}`).digest('hex').slice(0, 32)}`;
    const body = { type: 'answered', eventId: `${prefix}-answer`, queryId, answers: { winning_date: 'September 19' } };
    const results = await Promise.all([
      recordTieOwnerEvent(id, body, afterDeadline), recordTieOwnerEvent(id, body, afterDeadline),
      bookPoll(pollId, ownerUid, { optionId: b }, afterDeadline),
    ]);
    expect(new Set(results.map(result => result.eventId)).size).toBe(1);
    const { poll } = await effects(pollId);
    expect([a, b]).toContain(poll.selected_option_id);
    const decision = await db.collection('poll_owner_decisions').doc(id).get();
    expect(decision.data()).toMatchObject({ state: 'resolved', eventId: poll.event_id, selectedOptionId: poll.selected_option_id });
    expect((await decision.ref.collection('events').get()).size).toBe(1);
    // The real SDK retries transaction callbacks when concurrent writers conflict.
    expect(state.callbacks).toBeGreaterThan(state.transactions);
  }, 60000);
});
