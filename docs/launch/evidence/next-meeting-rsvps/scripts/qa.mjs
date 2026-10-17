// Temporary QA principals and synthetic RSVP rows for verifying the organizer
// RSVP view. Uses the repo's firebase-admin via createRequire and Application
// Default Credentials (GOOGLE_APPLICATION_CREDENTIALS). Every write here is a
// test artifact that the caller removes again in the same session.
import { createRequire } from 'node:module';

const require = createRequire('/Volumes/Projects/gay-i-concierge/package.json');
const { initializeApp, getApps, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: 'gayiclub' });
export const auth = getAuth();
export const db = getFirestore();

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
  const snap = await db.collection('app_admins').get();
  return snap.docs.map(d => d.id);
}
export async function addRsvp(eventId, uid) {
  const ev = await db.collection('events').doc(eventId).get();
  if (!ev.exists) throw new Error(`event ${eventId} not found`);
  const id = `${eventId}_${uid}`;
  await db.collection('rsvps').doc(id).set({ profile_id: uid, event_id: eventId, event_date: ev.data().event_datetime ?? null, created_at: Timestamp.now() });
  return { added: id };
}
export async function removeRsvp(eventId, uid) {
  const id = `${eventId}_${uid}`;
  await db.collection('rsvps').doc(id).delete();
  return { removed: id };
}
export async function listRsvps(eventId) {
  const snap = await db.collection('rsvps').where('event_id', '==', eventId).get();
  return snap.docs.map(d => ({ id: d.id, profile_id: d.data().profile_id, created_at: d.data().created_at?.toDate?.()?.toISOString() ?? null }));
}
export async function getEventLocation(eventId) {
  const ev = await db.collection('events').doc(eventId).get();
  return ev.exists ? (ev.data().location ?? null) : null;
}
export async function userProfileExists(uid) {
  return (await db.collection('user_profiles').doc(uid).get()).exists;
}

// CLI: node qa.mjs <action> [...args]
if (process.argv[1] && process.argv[1].endsWith('qa.mjs')) {
  const [, , action, ...args] = process.argv;
  const actions = { createUser, deleteUser, grantAdmin, revokeAdmin, listAdmins, addRsvp, removeRsvp, listRsvps, userProfileExists };
  if (!actions[action]) throw new Error(`unknown action ${action}`);
  console.log(JSON.stringify(await actions[action](...args)));
  process.exit(0);
}
