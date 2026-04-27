import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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

  const admin = getSupabaseAdmin();
  // Two-pass to count insert vs update: check which URLs already exist.
  const urls = cleaned.map(i => i.source_url);
  const { data: existing } = await admin
    .from('news_items')
    .select('source_url')
    .in('source_url', urls);
  const existingSet = new Set((existing || []).map(r => r.source_url as string));

  const { error } = await admin
    .from('news_items')
    .upsert(cleaned, { onConflict: 'source_url' });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updated = cleaned.filter(i => existingSet.has(i.source_url)).length;
  const inserted = cleaned.length - updated;
  return NextResponse.json({ ok: true, inserted, updated, skipped });
}
