import { NextResponse } from 'next/server';
import { hasSecret, readBoundedText } from '@/lib/news-ingestion';
import { ingestNews } from '@/lib/news-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Compatible Cortex publisher endpoint. Every upsert respects owner deletion tombstones. */
export async function POST(req: Request) {
  if (!process.env.NEWS_INGEST_SECRET) return NextResponse.json({ error: 'News publisher is not configured' }, { status: 503 });
  if (!hasSecret(req, process.env.NEWS_INGEST_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(await readBoundedText(new Response(req.body, { headers: req.headers }), 600_000));
  } catch { return NextResponse.json({ error: 'Invalid or oversized JSON body' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || !Array.isArray((body as { items?: unknown }).items)) return NextResponse.json({ error: 'Expected items array' }, { status: 400 });
  const items = (body as { items: unknown[] }).items;
  if (items.length > 200) return NextResponse.json({ error: 'At most 200 items per request' }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...await ingestNews(items) });
  } catch (error) {
    console.error('News publisher failed', error);
    return NextResponse.json({ error: 'News ingestion failed' }, { status: 500 });
  }
}
