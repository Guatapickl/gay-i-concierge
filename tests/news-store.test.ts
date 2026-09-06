import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { ingestNews, removeNews, newsDocumentId } from '@/lib/news-store';

// Serialized transactions model Firestore's retry/serializable contract; no production DB calls.
function memoryDb() {
  const rows = new Map<string, Record<string, unknown>>();
  let pending = Promise.resolve();
  const collection = (name: string) => ({
    doc: (id: string) => ({ path: `${name}/${id}`, id }),
    where: (field: string, _op: string, value: unknown) => ({ collection: name, field, value }),
  });
  const db = { collection, runTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
    const run = pending.then(() => fn({
      get: async (ref: { path?: string; id?: string; collection?: string; field?: string; value?: unknown }) => {
        if (ref.path) return { exists: rows.has(ref.path), id: ref.id, ref, data: () => rows.get(ref.path!) };
        return { docs: [...rows.entries()].filter(([key, data]) => key.startsWith(ref.collection + '/') && data[ref.field!] === ref.value).map(([key, data]) => ({ id: key.split('/')[1], ref: { path: key }, data: () => data })) };
      },
      set: (ref: { path: string }, data: Record<string, unknown>, opts?: { merge: boolean }) => rows.set(ref.path, { ...(opts?.merge ? rows.get(ref.path) : {}), ...data }),
      delete: (ref: { path: string }) => rows.delete(ref.path),
    }));
    pending = run.then(() => undefined, () => undefined);
    return run;
  } };
  return { db: db as unknown as Firestore, rows };
}
const item = { title: 'A model', summary: 'Publisher summary', source_url: 'https://openai.com/index/a/?utm_source=rss' };

describe('durable news writes', () => {
  it('deduplicates concurrent runs and duplicates inside a payload', async () => {
    const { db, rows } = memoryDb();
    await Promise.all([ingestNews([item, item], db), ingestNews([{ ...item, source_url: 'https://openai.com/index/a' }], db)]);
    expect([...rows.keys()].filter(key => key.startsWith('news_items/'))).toHaveLength(1);
  });
  it('keeps owner-deleted stories deleted on replays, including tracking variants', async () => {
    const { db, rows } = memoryDb();
    await ingestNews([item], db);
    const id = newsDocumentId('https://openai.com/index/a');
    await removeNews(id, 'owner', db);
    const result = await ingestNews([item, { ...item, source_url: 'https://openai.com/index/a#top' }], db);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(2);
    expect(rows.has(`news_tombstones/${id}`)).toBe(true);
    expect(rows.has(`news_items/${id}`)).toBe(false);
  });
  it('reuses a pre-existing externally ingested document and removes duplicate copies', async () => {
    const { db, rows } = memoryDb();
    rows.set('news_items/old-id', { ...item, source_url: 'https://openai.com/index/a' });
    rows.set('news_items/duplicate-id', { ...item, source_url: 'https://openai.com/index/a' });
    await ingestNews([item], db);
    expect(rows.has('news_items/old-id')).toBe(true);
    expect(rows.has('news_items/duplicate-id')).toBe(false);
    await removeNews('old-id', 'owner', db);
    await ingestNews([item], db);
    expect([...rows.keys()].filter(key => key.startsWith('news_items/'))).toEqual([]);
  });
});
