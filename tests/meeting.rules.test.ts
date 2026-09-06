import { it, expect } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, deleteDoc, terminate, Timestamp } from 'firebase/firestore';
it.skipIf(process.env.RUN_FIREBASE_RULES_TESTS !== '1')('poll ballots are server-only and automation data stays private', async () => {
  const app = initializeApp({ projectId: 'demo-gayiclub', apiKey: 'demo-key' }, `meeting-rules-${Date.now()}`);
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const paths: string[] = [];
  const base = 'http://127.0.0.1:8080/v1/projects/demo-gayiclub/databases/(default)/documents';
  async function seed(path: string, fields: Record<string, unknown>) {
    const r = await fetch(`${base}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    expect(r.ok).toBe(true); paths.push(path);
  }
  try {
    const { user } = await signInAnonymously(auth);
    const prefix = `rules-${user.uid}`;
    const eventPath = `events/${prefix}`;
    await seed(eventPath, { title: { stringValue: 'Private meeting fixture' }, location: { stringValue: 'Private fixture address' } });
    // No public direct document reads or list queries may expose a meeting address.
    expect((await fetch(`${base}/${eventPath}`)).status).toBe(403);
    expect((await fetch(`${base}:runQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'events' }] } }) })).status).toBe(403);
    expect((await getDoc(doc(db, eventPath))).data()?.location).toBe('Private fixture address');

    for (const [name, offset] of [['open', 60000], ['expired', -60000]] as const) {
      const id = `${prefix}-${name}`;
      await seed(`meeting_polls/${id}`, { status: { stringValue: 'open' }, closes_at: { timestampValue: new Date(Date.now()+offset).toISOString() } });
      const votePath = `meeting_poll_votes/${id}_${user.uid}_option`;
      const write = setDoc(doc(db, votePath), { poll_id: id, option_id: 'option', user_id: user.uid, rank: 1, created_at: Timestamp.now() });
      await expect(write).rejects.toMatchObject({ code: 'permission-denied' });
      const ballotPath = `meeting_poll_ballots/${id}_${user.uid}`;
      await expect(setDoc(doc(db, ballotPath), { poll_id: id, user_id: user.uid, available_option_ids: [], unavailable_option_ids: ['option'], created_at: Timestamp.now(), updated_at: Timestamp.now() })).rejects.toMatchObject({ code: 'permission-denied' });
      // Existing responses remain readable but cannot be overwritten or deleted directly.
      for (const path of [votePath, ballotPath]) {
        await seed(path, { poll_id: { stringValue: id }, user_id: { stringValue: user.uid } });
        await expect(getDoc(doc(db, path))).resolves.toMatchObject({});
        await expect(setDoc(doc(db, path), { user_id: user.uid }, { merge: true })).rejects.toMatchObject({ code: 'permission-denied' });
        await expect(deleteDoc(doc(db, path))).rejects.toMatchObject({ code: 'permission-denied' });
      }
    }
    for (const collection of ['meeting_automation_config','meeting_automation_requests','news_tombstones','poll_outcomes','poll_owner_decisions']) {
      const path = `${collection}/${prefix}`; await seed(path, { private: { booleanValue: true } });
      await expect(getDoc(doc(db, path))).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(setDoc(doc(db, path), { private: false })).rejects.toMatchObject({ code: 'permission-denied' });
    }
  } finally {
    await Promise.all(paths.map(path => fetch(`${base}/${path}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } })));
    if (auth.currentUser) await deleteUser(auth.currentUser);
    await terminate(db); await deleteApp(app);
  }
}, 20000);
