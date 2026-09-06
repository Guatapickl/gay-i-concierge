import { NextResponse } from 'next/server';
import { hasSecret } from '@/lib/news-ingestion';
import { refreshNews } from '@/lib/news-refresh';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'News scheduler is not configured' }, { status: 503 });
  if (!hasSecret(req, process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return refreshNews();
}
export const GET = POST;
