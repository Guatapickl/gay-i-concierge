import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import { callerFromRequest } from '../_lib/caller';
import type { NewsItem } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Pagination parameters
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
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
  // Authentication check (Bearer ID token or __session cookie)
  const user = await callerFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      summary,
      source_url,
      source_name,
      tag,
      tag_color,
      published_at,
      is_hot,
      relevance_score,
    } = body;

    if (!title || !summary || !source_url) {
      return NextResponse.json(
        { error: 'Missing required fields: title, summary, source_url' },
        { status: 400 }
      );
    }

    const row = {
      title,
      summary,
      source_url,
      source_name: source_name || null,
      tag: tag || null,
      tag_color: tag_color || null,
      published_at: published_at || new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      is_hot: is_hot || false,
      relevance_score: relevance_score || null,
    };

    try {
      const ref = adminDb().collection('news_items').doc();
      await ref.set(adminPayloadOf(row));
      const data = adminRowOf<NewsItem>(await ref.get());
      return NextResponse.json({ data }, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'insert failed' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
