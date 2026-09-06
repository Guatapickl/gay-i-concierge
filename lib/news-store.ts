import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { adminPayloadOf } from '@/lib/firebase/adminDb';
import { canonicalNewsUrl, normalizeNewsItem, type NewsInput } from '@/lib/news-ingestion';

export function newsDocumentId(url: string): string {
  const canonical = canonicalNewsUrl(url);
  if (!canonical) throw new Error('Invalid news URL');
  return createHash('sha256').update(canonical).digest('hex');
}

/** All publishers share the same tombstone/read/write transaction and canonical URL key. */
export async function ingestNews(items: unknown[], db: Firestore = adminDb(), concurrency = 8) {
  const counts = { inserted: 0, updated: 0, skipped: 0 };
  const seen = new Set<string>();
  const queue: NewsInput[] = [];
  for (const raw of items) {
    const item = normalizeNewsItem(raw);
    if (!item || seen.has(item.source_url)) { counts.skipped++; continue; }
    seen.add(item.source_url);
    queue.push(item);
  }
  const col = db.collection('news_items');
  const upsert = async (item: NewsInput) => {
    const id = newsDocumentId(item.source_url);
    return db.runTransaction(async tx => {
      const tombstone = await tx.get(db.collection('news_tombstones').doc(id));
      if (tombstone.exists) return 'skipped' as const;
      const target = col.doc(id);
      const current = await tx.get(target);
      // Preserve IDs saved by members for documents from the original Cortex publisher.
      const legacy = await tx.get(col.where('source_url', '==', item.source_url));
      const existing = current.exists ? target : legacy.docs[0]?.ref;
      const now = new Date().toISOString();
      const payload = adminPayloadOf({ ...item, ...(existing ? {} : { ingested_at: now }) });
      tx.set(existing || target, payload, { merge: true });
      for (const duplicate of legacy.docs) {
        if (duplicate.ref.path !== (existing || target).path) tx.delete(duplicate.ref);
      }
      return existing ? 'updated' as const : 'inserted' as const;
    });
  };
  // Bounded parallelism keeps a 16-source refresh inside the route's 60s budget; each URL is unique so transactions never contend.
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < queue.length) counts[await upsert(queue[cursor++])]++;
  }));
  return counts;
}

export async function removeNews(id: string, ownerUid: string, db: Firestore = adminDb()) {
  const col = db.collection('news_items');
  return db.runTransaction(async tx => {
    const target = col.doc(id);
    const snap = await tx.get(target);
    if (!snap.exists) return false;
    const sourceUrl = canonicalNewsUrl(snap.data()?.source_url);
    if (!sourceUrl) throw new Error('News item has an invalid source URL');
    const canonicalId = newsDocumentId(sourceUrl);
    const copies = await tx.get(col.where('source_url', '==', sourceUrl));
    tx.set(db.collection('news_tombstones').doc(canonicalId), {
      source_url: sourceUrl, deleted_by: ownerUid, deleted_at: new Date().toISOString(),
    });
    tx.delete(target);
    tx.delete(col.doc(canonicalId));
    for (const copy of copies.docs) tx.delete(copy.ref);
    return true;
  });
}
