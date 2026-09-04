/**
 * Server-side counterparts of lib/firebase/db.ts for API routes (Admin SDK).
 */
import { Timestamp, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { TIMESTAMP_FIELDS } from './fields';

export function adminToIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return null;
}

export function adminRowOf<T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  const data = snap.data() || {};
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) out[k] = TIMESTAMP_FIELDS.has(k) ? adminToIso(v) : v;
  return out as T;
}

export function adminPayloadOf(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || v === undefined) continue;
    if (TIMESTAMP_FIELDS.has(k) && typeof v === 'string') out[k] = Timestamp.fromDate(new Date(v));
    else if (TIMESTAMP_FIELDS.has(k) && v instanceof Date) out[k] = Timestamp.fromDate(v);
    else out[k] = v;
  }
  return out;
}
