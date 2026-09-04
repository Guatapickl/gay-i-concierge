/**
 * Small Firestore helpers shared by the client data layer (lib/*.ts).
 * Documents keep the Postgres column names; timestamps are stored as
 * Firestore Timestamps and read back as ISO strings so the UI and the
 * email templates keep working unchanged.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './client';
import { TIMESTAMP_FIELDS } from './fields';

export { TIMESTAMP_FIELDS };

/** Firestore Timestamp | Date | ISO string | null → ISO string | null */
export function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'seconds' in (v as Record<string, unknown>)) {
    const t = v as { seconds: number; nanoseconds?: number };
    return new Timestamp(t.seconds, t.nanoseconds ?? 0).toDate().toISOString();
  }
  return null;
}

/** ISO string | Date | null → Timestamp | null, for writes. */
export function toTs(v: string | Date | null | undefined): Timestamp | null {
  if (!v) return null;
  const d = typeof v === 'string' ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

/** Snapshot → plain row with `id` and ISO timestamps. */
export function rowOf<T = DocumentData>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  const data = snap.data() || {};
  const out: Record<string, unknown> = { id: snap.id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = TIMESTAMP_FIELDS.has(k) ? toIso(v) : v;
  }
  return out as T;
}

/** Plain row → write payload with Timestamps; strips `id` and undefined. */
export function payloadOf(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id' || v === undefined) continue;
    out[k] = TIMESTAMP_FIELDS.has(k) && (typeof v === 'string' || v instanceof Date) ? toTs(v) : v;
  }
  return out;
}

export function col(name: string) {
  return collection(db, name);
}

export function ref(name: string, id: string) {
  return doc(db, name, id);
}

export async function getRow<T>(name: string, id: string): Promise<T | null> {
  const snap = await getDoc(ref(name, id));
  return snap.exists() ? rowOf<T>(snap) : null;
}

export async function listRows<T>(name: string, ...constraints: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(col(name), ...constraints));
  return snap.docs.map(d => rowOf<T>(d));
}

export function nowIso() {
  return new Date().toISOString();
}

/** Firestore `in` accepts ≤30 values; chunk larger lists. */
export function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
