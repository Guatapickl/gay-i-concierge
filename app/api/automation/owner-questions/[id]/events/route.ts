import { NextResponse } from 'next/server';
import { automationAuthorized, recordOwnerEvent } from '@/lib/meeting-automation';
export const runtime = 'nodejs';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!automationAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const raw = await req.text();
    if (raw.length > 20000) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid event');
    return NextResponse.json(await recordOwnerEvent((await ctx.params).id, body));
  } catch (error) {
    console.error('Owner availability callback failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Availability callback could not be recorded' }, { status: 400 });
  }
}
