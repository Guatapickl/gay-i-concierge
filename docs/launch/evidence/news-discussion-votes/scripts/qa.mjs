// Temporary QA principals, fixtures and cleanup for verifying "I want to talk
// about this" votes. Uses the repo's firebase-admin via createRequire.
//   QA_MODE=emulator  -> demo-gayiclub against the loopback Firestore/Auth emulators
//   QA_MODE=live      -> project gayiclub with Application Default Credentials
// Every write is a test artifact that the same session removes again; nothing
// here touches a real member's vote or a real meeting's agenda.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire('/Volumes/Projects/gay-i-concierge/package.json');
const { initializeApp, getApps, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const mode = process.env.QA_MODE === 'emulator' ? 'emulator' : 'live';
if (mode === 'emulator') {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('emulator mode needs FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099');
  if (!getApps().length) initializeApp({ projectId: 'demo-gayiclub' });
} else if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: 'gayiclub' });
export const auth = getAuth();
export const db = getFirestore();
export const voteId = (newsId, uid) => createHash('sha256').update(JSON.stringify([newsId, uid])).digest('hex');

export async function createUser(email, password, displayName) {
  const user = await auth.createUser({ email, password, emailVerified: true, displayName });
  return { uid: user.uid, email: user.email };
}
export async function deleteUser(email) {
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) return { deleted: null, email };
  await auth.deleteUser(user.uid);
  return { deleted: user.uid, email };
}
export async function grantAdmin(uid, note) {
  await db.collection('app_admins').doc(uid).set({ created_at: Timestamp.now(), note });
  return { granted: uid };
}
export async function revokeAdmin(uid) {
  await db.collection('app_admins').doc(uid).delete();
  return { revoked: uid };
}
export async function listAdmins() {
  return (await db.collection('app_admins').get()).docs.map(d => d.id);
}
/** Vote documents belonging to one uid (by field and by the deterministic id). */
export async function listVotes(uid) {
  const snap = await db.collection('news_discussion_votes').where('user_id', '==', uid).get();
  return snap.docs.map(d => ({ id: d.id, news_id: d.data().news_id, active: d.data().active !== false, withdrawals: d.data().withdrawal_count ?? 0, idMatches: d.id === voteId(d.data().news_id, uid) }));
}
export async function deleteVotes(uid) {
  const votes = await listVotes(uid);
  for (const vote of votes) await db.collection('news_discussion_votes').doc(vote.id).delete();
  return { deleted: votes.map(v => v.id) };
}
export async function countVotes() {
  return { total: (await db.collection('news_discussion_votes').count().get()).data().count };
}
export async function userProfileExists(uid) {
  return (await db.collection('user_profiles').doc(uid).get()).exists;
}
export async function firstStories(limit = 2) {
  const snap = await db.collection('news_items').orderBy('published_at', 'desc').limit(Number(limit)).get();
  return snap.docs.map(d => ({ id: d.id, title: d.data().title, source_url: d.data().source_url }));
}
export async function getEventAgenda(eventId) {
  const ev = await db.collection('events').doc(eventId).get();
  return ev.exists ? { id: ev.id, title: ev.data().title, agenda: ev.data().agenda ?? null } : null;
}

/** Emulator-only: simulate another organizer adding a line to a stored agenda after the maker loaded it. */
export async function appendAgendaLine(eventId, title) {
  if (mode !== 'emulator') throw new Error('appendAgendaLine is emulator-only; live agendas are never touched by QA');
  const ref = db.collection('events').doc(eventId);
  const snap = await ref.get();
  const agenda = Array.isArray(snap.data()?.agenda) ? snap.data().agenda : [];
  const next = [...agenda, { time: null, title, speaker: 'Other organizer', notes: 'Stored while the maker was open', link: null, news_id: null }];
  await ref.update({ agenda: next, updated_at: Timestamp.now() });
  return { eventId, appended: title, count: next.length };
}

// Emulator-only fixtures: two stories, an upcoming meeting with a saved agenda,
// an upcoming meeting with no agenda yet, and a past meeting whose agenda
// already carries story B.
export async function seedEmulator() {
  if (mode !== 'emulator') throw new Error('seedEmulator is emulator-only');
  const stories = [
    { id: 'qa-story-a', title: 'QA story A: agents that plan their own evals', source_url: 'https://example.com/qa/story-a?utm_source=rss', source_name: 'Example Lab', tag: 'Research', published_at: '2026-09-12T10:00:00.000Z' },
    { id: 'qa-story-b', title: 'QA story B: a policy brief on model licensing', source_url: 'https://example.com/qa/story-b', source_name: 'Example Policy', tag: 'Policy', published_at: '2026-09-11T10:00:00.000Z' },
  ];
  for (const s of stories) {
    await db.collection('news_items').doc(s.id).set({ ...s, summary: 'Seeded for the news discussion QA run.', tag_color: null, is_hot: false, relevance_score: null, published_at: Timestamp.fromDate(new Date(s.published_at)), ingested_at: Timestamp.now() });
  }
  await db.collection('events').doc('qa-next-meeting').set({
    title: 'QA next meeting', description: 'Seeded fixture', location: 'QA venue', event_datetime: Timestamp.fromDate(new Date('2099-10-11T22:30:00.000Z')), created_at: Timestamp.now(),
    agenda: [{ time: null, title: 'Welcome & introductions', speaker: null, notes: 'Existing saved item' }, { time: '7:15 PM', title: 'Existing feature talk', speaker: 'Sam', notes: null }],
  });
  await db.collection('events').doc('qa-empty-meeting').set({
    title: 'QA empty meeting', description: 'Seeded fixture without an agenda', location: 'QA venue', event_datetime: Timestamp.fromDate(new Date('2099-11-08T23:30:00.000Z')), created_at: Timestamp.now(),
  });
  await db.collection('events').doc('qa-past-meeting').set({
    title: 'QA past meeting', description: 'Seeded fixture', location: 'QA venue', event_datetime: Timestamp.fromDate(new Date('2026-08-01T22:30:00.000Z')), created_at: Timestamp.now(),
    agenda: [{ time: null, title: 'Discussed already', speaker: null, notes: null, link: 'https://example.com/qa/story-b?utm_medium=mail', news_id: null }],
  });
  return { stories: stories.map(s => s.id), events: ['qa-next-meeting', 'qa-empty-meeting', 'qa-past-meeting'] };
}

// CLI: node qa.mjs <action> [...args]
if (process.argv[1] && process.argv[1].endsWith('qa.mjs')) {
  const [, , action, ...args] = process.argv;
  const actions = { createUser, deleteUser, grantAdmin, revokeAdmin, listAdmins, listVotes, deleteVotes, countVotes, userProfileExists, firstStories, getEventAgenda, appendAgendaLine, seedEmulator };
  if (!actions[action]) throw new Error(`unknown action ${action}`);
  console.log(JSON.stringify(await actions[action](...args)));
  process.exit(0);
}
