import { NextResponse } from 'next/server';
import { collectNews } from '@/lib/news-ingestion';
import { ingestNews } from '@/lib/news-store';

export async function refreshNews() {
  try {
    const { items, sources } = await collectNews();
    if (!sources.some(source => source.ok)) return NextResponse.json({ error: 'News sources are temporarily unavailable. Try again later.', sources }, { status: 502 });
    const counts = await ingestNews(items);
    return NextResponse.json({ ok: true, ...counts, sources, partial: sources.some(source => !source.ok) });
  } catch (error) {
    console.error('News refresh failed', error);
    return NextResponse.json({ error: 'News refresh failed. Try again later.' }, { status: 500 });
  }
}
