import { addDoc, orderBy, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase/client';
import { col, listRows, nowIso, payloadOf, ref } from './firebase/db';

export type Interest = { id: string; name: string };

/** user_interests doc id — mirrors the Postgres (user_id, interest_id) unique key. */
export function userInterestDocId(userId: string, interestId: string) {
  return `${userId}_${interestId}`;
}

export async function fetchInterests(): Promise<Interest[]> {
  try {
    const rows = await listRows<Interest>('interests', orderBy('name', 'asc'));
    return rows.map(r => ({ id: r.id, name: r.name }));
  } catch (err) {
    console.error('Error fetching interests:', (err as Error).message);
    return [];
  }
}

export async function findOrCreateInterest(name: string): Promise<Interest | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const existing = await listRows<Interest>('interests', where('name', '==', trimmed));
    if (existing.length > 0) return { id: existing[0].id, name: existing[0].name };
  } catch (err) {
    console.warn('Interest lookup error:', (err as Error).message);
  }
  try {
    const d = await addDoc(col('interests'), payloadOf({ name: trimmed, created_at: nowIso() }));
    return { id: d.id, name: trimmed };
  } catch (err) {
    console.error('Error inserting new interest:', (err as Error).message);
    return null;
  }
}

export async function linkUserInterests(userId: string, interestIds: string[]): Promise<boolean> {
  if (interestIds.length === 0) return true;
  try {
    const batch = writeBatch(db);
    const created_at = nowIso();
    for (const id of interestIds) {
      batch.set(
        ref('user_interests', userInterestDocId(userId, id)),
        payloadOf({ user_id: userId, interest_id: id, created_at }),
        { merge: true },
      );
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.error('Error linking interests:', (err as Error).message);
    return false;
  }
}
