import { NextResponse } from 'next/server';
import { callerFromRequest } from '@/app/api/_lib/caller';
import { isAdminUid } from '@/lib/firebase/admin';
import { removeNews } from '@/lib/news-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdminUid(caller.uid)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  const { id } = await context.params;
  if (!/^[\w-]{1,200}$/.test(id)) return NextResponse.json({ error: 'Invalid story ID' }, { status: 400 });
  try {
    const removed = await removeNews(id, caller.uid);
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    console.error('News removal failed', error);
    return NextResponse.json({ error: 'Could not remove this story. Try again.' }, { status: 500 });
  }
}
