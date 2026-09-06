import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';

const mocks = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: () => mocks.db }));
import { ballotDocId, savePollBallot, validateBallot } from '@/lib/poll-ballots';

type Row = Record<string, unknown>;
type Target = { path: string; filter?: [string, unknown] };
function memoryDb(initial: Record<string, Row>) {
  const rows = new Map(Object.entries(initial));
  let failCommit = false;
  let committedWrites = 0;
  const snapshot = (path: string) => ({ id: path.split('/').at(-1), exists: rows.has(path), data: () => rows.get(path) });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}` }),
      where: (field: string, _operator: string, value: unknown) => ({ path: name, filter: [field, value] }),
    }),
    runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
      const writes: Array<{ target: Target; row: Row; merge: boolean }> = [];
      const tx = {
        get: async (target: Target) => target.filter ? {
          docs: [...rows.entries()].filter(([path, row]) => path.startsWith(`${target.path}/`) && row[target.filter![0]] === target.filter![1]).map(([path]) => snapshot(path)),
        } : snapshot(target.path),
        set: (target: Target, row: Row) => writes.push({ target, row, merge: false }),
        update: (target: Target, row: Row) => writes.push({ target, row, merge: true }),
      };
      const result = await callback(tx);
      if (failCommit) throw new Error('Commit unavailable');
      for (const write of writes) rows.set(write.target.path, write.merge ? { ...rows.get(write.target.path), ...write.row } : write.row);
      committedWrites += writes.length;
      return result;
    },
  };
  return { db, rows, rejectCommit: () => { failCommit = true; }, committedWrites: () => committedWrites };
}

const now = new Date('2026-09-10T12:00:00Z');
const ballotPath = `meeting_poll_ballots/${ballotDocId('p', 'member')}`;
const prior = {
  poll_id: 'p', user_id: 'member', available_option_ids: ['a', 'b'], unavailable_option_ids: [],
  created_at: Timestamp.fromDate(new Date('2026-09-06T12:00:00Z')), updated_at: Timestamp.fromDate(new Date('2026-09-06T12:00:00Z')),
};
let store: ReturnType<typeof memoryDb>;
beforeEach(() => {
  store = memoryDb({
    'meeting_polls/p': { status: 'open', closes_at: Timestamp.fromDate(new Date('2026-09-11T22:00:00Z')), ballot_revision: 4 },
    'meeting_poll_options/a': { poll_id: 'p' }, 'meeting_poll_options/b': { poll_id: 'p' },
    'meeting_poll_options/other': { poll_id: 'other-poll' },
    [ballotPath]: prior,
  });
  mocks.db = store.db;
});

describe('ballot partition validation', () => {
  it('accepts all unavailable and preserves available preference order', () => {
    expect(validateBallot(['a', 'b'], { availableOptionIds: [], unavailableOptionIds: ['a', 'b'] })).toEqual({ availableOptionIds: [], unavailableOptionIds: ['a', 'b'] });
    expect(validateBallot(['a', 'b'], { availableOptionIds: ['b', 'a'], unavailableOptionIds: [] }).availableOptionIds).toEqual(['b', 'a']);
  });
  it.each([
    ['incomplete', { availableOptionIds: ['a'], unavailableOptionIds: [] }],
    ['duplicate within ranking', { availableOptionIds: ['a', 'a'], unavailableOptionIds: [] }],
    ['duplicate across availability groups', { availableOptionIds: ['a'], unavailableOptionIds: ['a'] }],
    ['unknown date', { availableOptionIds: ['a'], unavailableOptionIds: ['unknown'] }],
    ['nonstring date', { availableOptionIds: ['a'], unavailableOptionIds: [2] }],
    ['missing arrays', { availableOptionIds: ['a', 'b'] }],
    ['null', null], ['array input', []],
  ])('rejects %s', (_name, input) => {
    expect(() => validateBallot(['a', 'b'], input)).toThrow();
  });
  it('rejects polls without options', () => {
    expect(() => validateBallot([], { availableOptionIds: [], unavailableOptionIds: [] })).toThrow();
  });
});

describe('atomic ballot replacement', () => {
  it('replaces the prior response with all unavailable and preserves its creation time', async () => {
    await expect(savePollBallot('p', 'member', { availableOptionIds: [], unavailableOptionIds: ['a', 'b'] }, now)).resolves.toEqual({ ok: true });
    expect(store.rows.get(ballotPath)).toEqual({ ...prior, available_option_ids: [], unavailable_option_ids: ['a', 'b'], updated_at: Timestamp.fromDate(now) });
    expect(store.rows.get('meeting_polls/p')?.ballot_revision).toBe(5);
    expect(store.committedWrites()).toBe(2);
  });
  it('retains the old response when a new partition is invalid', async () => {
    await expect(savePollBallot('p', 'member', { availableOptionIds: ['a'], unavailableOptionIds: [] }, now)).rejects.toMatchObject({ status: 400 });
    expect(store.rows.get(ballotPath)).toEqual(prior);
    expect(store.committedWrites()).toBe(0);
  });
  it('rejects the exact deadline and preserves the prior response', async () => {
    await expect(savePollBallot('p', 'member', { availableOptionIds: [], unavailableOptionIds: ['a', 'b'] }, new Date('2026-09-11T22:00:00Z'))).rejects.toMatchObject({ status: 409 });
    expect(store.rows.get(ballotPath)).toEqual(prior);
    expect(store.rows.get('meeting_polls/p')?.ballot_revision).toBe(4);
    expect(store.committedWrites()).toBe(0);
  });
  it('rejects a closed poll even before its deadline', async () => {
    store.rows.set('meeting_polls/p', { ...store.rows.get('meeting_polls/p'), status: 'closed' });
    await expect(savePollBallot('p', 'member', { availableOptionIds: ['a', 'b'], unavailableOptionIds: [] }, now)).rejects.toMatchObject({ status: 409 });
    expect(store.rows.get(ballotPath)).toEqual(prior);
  });
  it('does not delete the prior ballot or advance the revision when commit fails', async () => {
    store.rejectCommit();
    await expect(savePollBallot('p', 'member', { availableOptionIds: ['b'], unavailableOptionIds: ['a'] }, now)).rejects.toThrow('Commit unavailable');
    expect(store.rows.get(ballotPath)).toEqual(prior);
    expect(store.rows.get('meeting_polls/p')?.ballot_revision).toBe(4);
    expect(store.committedWrites()).toBe(0);
  });
  it('rejects a missing poll without creating a response', async () => {
    await expect(savePollBallot('missing', 'member', { availableOptionIds: [], unavailableOptionIds: ['a', 'b'] }, now)).rejects.toMatchObject({ status: 404 });
    expect(store.committedWrites()).toBe(0);
  });
  it('creates a new member response with matching creation and update timestamps', async () => {
    await savePollBallot('p', 'new-member', { availableOptionIds: ['b'], unavailableOptionIds: ['a'] }, now);
    expect(store.rows.get(`meeting_poll_ballots/${ballotDocId('p', 'new-member')}`)).toMatchObject({
      user_id: 'new-member', available_option_ids: ['b'], unavailable_option_ids: ['a'], created_at: Timestamp.fromDate(now), updated_at: Timestamp.fromDate(now),
    });
    expect(store.rows.get(ballotPath)).toEqual(prior);
  });
});
