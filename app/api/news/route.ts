import { NextResponse } from 'next/server';
import { adminDb, isAdminUid } from '@/lib/firebase/admin';
import { adminRowOf } from '@/lib/firebase/adminDb';
import { callerFromRequest } from '../_lib/caller';
import { ingestNews } from '@/lib/news-store';
import { normalizeNewsItem } from '@/lib/news-ingestion';
import type { NewsItem } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Pagination parameters
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10) || 20));
  const page = Math.max(1, Math.min(1000, parseInt(searchParams.get('page') || '1', 10) || 1));
  const offset = (page - 1) * limit;

  try {
    const col = adminDb().collection('news_items');
    const [countSnap, pageSnap] = await Promise.all([
      col.count().get(),
      col
        .orderBy('published_at', 'desc')
        .orderBy('ingested_at', 'desc')
        .offset(offset)
        .limit(limit)
        .get(),
    ]);
    const count = countSnap.data().count;
    const data = pageSnap.docs.map(d => adminRowOf<NewsItem>(d));

    return NextResponse.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'query failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await callerFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdminUid(user.uid)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  let item;
  try { item = normalizeNewsItem(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }
  if (!item) return NextResponse.json({ error: 'A title, summary and valid source URL are required' }, { status: 400 });
  try {
    const counts = await ingestNews([item]);
    if (counts.skipped) return NextResponse.json({ error: 'This source was removed by the owner' }, { status: 409 });
    return NextResponse.json({ ok: true, ...counts }, { status: counts.inserted ? 201 : 200 });
  } catch (error) {
    console.error('News creation failed', error);
    return NextResponse.json({ error: 'Could not add this story' }, { status: 500 });
  }
}
