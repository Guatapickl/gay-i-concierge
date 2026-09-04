import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { adminPayloadOf } from '@/lib/firebase/adminDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ingest endpoint for The Cortex sensorium publisher.
 *
 * Auth: requires `NEWS_INGEST_SECRET` env var, passed as `Authorization: Bearer <secret>`.
 * Body: { items: NewsItemInput[] }
 *
 * Items are upserted on `source_url` so the publisher can replay safely.
 * Returns counts for inserted/updated/skipped.
 */

type NewsItemInput = {
  title: string;
  summary: string;
  source_url: string;
  source_name?: string | null;
  tag?: string | null;
  tag_color?: string | null;
  published_at?: string | null;
  is_hot?: boolean;
  relevance_score?: number | null;
};

/** Firestore `in` accepts ≤30 values. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  const expected = process.env.NEWS_INGEST_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'NEWS_INGEST_SECRET not configured on the server' },
      { status: 500 },
    );
  }
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
  if (bearer !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { items?: NewsItemInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, updated: 0, skipped: 0 });
  }

  // Validate + normalize
  const cleaned: NewsItemInput[] = [];
  let skipped = 0;
  for (const it of items) {
    if (!it?.title?.trim() || !it?.summary?.trim() || !it?.source_url?.trim()) {
      skipped += 1;
      continue;
    }
    cleaned.push({
      title: it.title.trim().slice(0, 300),
      summary: it.summary.trim().slice(0, 2000),
      source_url: it.source_url.trim(),
      source_name: it.source_name?.trim() || null,
      tag: it.tag?.trim() || null,
      tag_color: it.tag_color?.trim() || null,
      published_at: it.published_at || null,
      is_hot: !!it.is_hot,
      relevance_score:
        typeof it.relevance_score === 'number' ? Math.max(0, Math.min(1, it.relevance_score)) : null,
    });
  }

  const db = adminDb();
  const col = db.collection('news_items');

  try {
    // Upsert on source_url: find existing docs by URL, update those, create the rest.
    const urls = Array.from(new Set(cleaned.map(i => i.source_url)));
    const existingByUrl = new Map<string, FirebaseFirestore.DocumentReference>();
    for (const part of chunk(urls)) {
      const snap = await col.where('source_url', 'in', part).get();
      for (const d of snap.docs) {
        const url = (d.data() as { source_url: string }).source_url;
        if (!existingByUrl.has(url)) existingByUrl.set(url, d.ref);
      }
    }

    const now = new Date().toISOString();
    let updated = 0;
    for (const part of chunk(cleaned, 400)) {
      const batch = db.batch();
      for (const item of part) {
        const ref = existingByUrl.get(item.source_url);
        if (ref) {
          updated += 1;
          batch.set(ref, adminPayloadOf({ ...item }), { merge: true });
        } else {
          const newRef = col.doc();
          existingByUrl.set(item.source_url, newRef); // dedupe repeats within one payload
          batch.set(newRef, adminPayloadOf({ ...item, ingested_at: now }));
        }
      }
      await batch.commit();
    }

    const inserted = cleaned.length - updated;
    return NextResponse.json({ ok: true, inserted, updated, skipped });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'ingest failed' }, { status: 500 });
  }
}
