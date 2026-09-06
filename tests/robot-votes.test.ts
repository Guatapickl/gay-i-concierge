import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rows: new Map<string, Record<string, unknown>>(), user: { uid: 'member-a' } as { uid: string } | null, fail: false }));
vi.mock('../lib/firebase/admin', () => ({
  userFromRequest: async () => state.user,
  adminDb: () => ({
    collection: () => ({ doc: (id: string) => ({ id }), get: async () => ({ docs: [...state.rows].map(([id, row]) => ({ id, data: () => row })) }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const pending: (() => void)[] = [];
      const result = await fn({ get: async (ref: { id: string }) => ({ exists: state.rows.has(ref.id) }), create: (ref: { id: string }, row: Record<string, unknown>) => pending.push(() => { state.rows.set(ref.id, row); }), delete: (ref: { id: string }) => pending.push(() => { state.rows.delete(ref.id); }) });
      if (state.fail) throw new Error('Temporary write failure');
      pending.forEach(write => write()); return result;
    },
  }),
}));
import { getRobotVotes, saveRobotVote, robotVoteId, validateRobotVote } from '../lib/robot-votes';
import { GET, PUT } from '../app/api/robot/votes/route';
const robotId = 'claude-fable-5';
beforeEach(() => { state.rows.clear(); state.user = { uid: 'member-a' }; state.fail = false; });
it('saves a vote, survives reload, deduplicates retries, and permits removal', async () => {
  await saveRobotVote('member-a', { robotId, voted: true });
  await saveRobotVote('member-a', { robotId, voted: true });
  expect((await getRobotVotes('member-a')).votes.find(v => v.robotId === robotId)).toEqual({ robotId, count: 1, votedByMe: true });
  await saveRobotVote('member-b', { robotId, voted: true });
  await saveRobotVote('member-a', { robotId, voted: false });
  await saveRobotVote('member-a', { robotId, voted: false });
  expect((await getRobotVotes('member-a')).votes.find(v => v.robotId === robotId)).toEqual({ robotId, count: 1, votedByMe: false });
  expect(state.rows.has(robotVoteId(robotId, 'member-b'))).toBe(true);
});
it.each([null, [], {}, { robotId: 'unknown', voted: true }, { robotId, voted: 'false' }])('rejects invalid vote %j', input => { expect(() => validateRobotVote(input)).toThrow(); });
it('never exposes voter identifiers and ignores malformed duplicate records', async () => {
  await saveRobotVote('secret-user-identifier', { robotId, voted: true });
  state.rows.set('malformed', { robot_id: robotId, user_id: 'secret-user-identifier' });
  const output = await getRobotVotes('member-a');
  expect(JSON.stringify(output)).not.toContain('secret-user-identifier');
  expect(output.votes.find(v => v.robotId === robotId)?.count).toBe(1);
});
it('preserves a saved vote when removal fails', async () => {
  await saveRobotVote('member-a', { robotId, voted: true }); state.fail = true;
  await expect(saveRobotVote('member-a', { robotId, voted: false })).rejects.toThrow();
  expect((await getRobotVotes('member-a')).votes.find(v => v.robotId === robotId)?.votedByMe).toBe(true);
});
it('uses authenticated identity rather than a supplied user ID', async () => {
  const response = await PUT(new Request('https://gayiclub.com/api/robot/votes', { method: 'PUT', body: JSON.stringify({ robotId, voted: true, userId: 'another-member' }) }));
  expect(response.status).toBe(200);
  expect(state.rows.has(robotVoteId(robotId, 'member-a'))).toBe(true);
  expect(state.rows.has(robotVoteId(robotId, 'another-member'))).toBe(false);
  expect(response.headers.get('cache-control')).toContain('no-store');
});
it('requires authentication for reading and changing votes', async () => {
  state.user = null;
  expect((await GET(new Request('https://gayiclub.com/api/robot/votes'))).status).toBe(401);
  expect((await PUT(new Request('https://gayiclub.com/api/robot/votes', { method: 'PUT', body: '{}' }))).status).toBe(401);
  expect(state.rows.size).toBe(0);
});
it('rejects invalid and oversized requests before any write', async () => {
  expect((await PUT(new Request('https://gayiclub.com/api/robot/votes', { method: 'PUT', body: '{}' }))).status).toBe(400);
  expect((await PUT(new Request('https://gayiclub.com/api/robot/votes', { method: 'PUT', body: 'x'.repeat(2001) }))).status).toBe(413);
  expect(state.rows.size).toBe(0);
});
