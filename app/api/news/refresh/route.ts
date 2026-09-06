import { NextResponse } from 'next/server';
import { callerFromRequest } from '@/app/api/_lib/caller';
import { isAdminUid } from '@/lib/firebase/admin';
import { refreshNews } from '@/lib/news-refresh';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(req: Request) {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdminUid(caller.uid)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  return refreshNews();
}
