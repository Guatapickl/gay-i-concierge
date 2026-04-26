import { NextResponse } from 'next/server';
import { processDueReminders } from '@/lib/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron-triggered endpoint that drains the email_reminders queue.
 * Intended to be hit every 5–15 minutes by Vercel Cron, GitHub Actions,
 * or any external scheduler.
 *
 * Auth: requires `CRON_SECRET` env var. Pass via either:
 *   - `Authorization: Bearer <CRON_SECRET>`
 *   - `?secret=<CRON_SECRET>` query param (handy for cron-job.org-style schedulers)
 */
async function handle(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('secret');
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
  if (queryToken !== expected && bearer !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 50));
  const result = await processDueReminders(limit);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
