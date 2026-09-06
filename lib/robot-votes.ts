import { createHash } from 'node:crypto';
import { adminDb } from './firebase/admin';
import { ROBOT_SHOWCASE } from './robot-showcase';

export function robotVoteId(robotId: string, userId: string) {
  return createHash('sha256').update(JSON.stringify([robotId, userId])).digest('hex');
}
export function validateRobotVote(input: unknown): { robotId: string; voted: boolean } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a showcase example and a vote.');
  const { robotId, voted } = input as Record<string, unknown>;
  if (typeof robotId !== 'string' || !ROBOT_SHOWCASE.some(robot => robot.id === robotId) || typeof voted !== 'boolean') throw new Error('Choose a showcase example and a vote.');
  return { robotId, voted };
}
export async function getRobotVotes(userId: string) {
  const snap = await adminDb().collection('robot_showcase_votes').get();
  const members = new Map(ROBOT_SHOWCASE.map(robot => [robot.id, new Set<string>()]));
  for (const doc of snap.docs) {
    const row = doc.data();
    if (typeof row.robot_id === 'string' && typeof row.user_id === 'string' && doc.id === robotVoteId(row.robot_id, row.user_id)) members.get(row.robot_id)?.add(row.user_id);
  }
  return { votes: ROBOT_SHOWCASE.map(robot => ({ robotId: robot.id, count: members.get(robot.id)!.size, votedByMe: members.get(robot.id)!.has(userId) })) };
}
export async function saveRobotVote(userId: string, input: { robotId: string; voted: boolean }) {
  const { robotId, voted } = validateRobotVote(input);
  const db = adminDb();
  const ref = db.collection('robot_showcase_votes').doc(robotVoteId(robotId, userId));
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (voted && !existing.exists) tx.create(ref, { robot_id: robotId, user_id: userId, created_at: new Date(), updated_at: new Date() });
    if (!voted && existing.exists) tx.delete(ref);
  });
  return getRobotVotes(userId);
}
