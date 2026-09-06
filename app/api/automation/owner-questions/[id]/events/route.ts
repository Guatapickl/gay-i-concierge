import { NextResponse } from 'next/server';
import { automationAuthorized, recordOwnerEvent } from '@/lib/meeting-automation';
import { recordTieOwnerEvent } from '@/lib/poll-outcomes';
export const runtime = 'nodejs';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!automationAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const raw = await req.text();
    if (raw.length > 20000) return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid event');
    const { id } = await ctx.params;
    return NextResponse.json(await (id.startsWith('tie-') ? recordTieOwnerEvent(id, body) : recordOwnerEvent(id, body)));
  } catch (error) {
    console.error('Owner questionnaire callback failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Questionnaire callback could not be recorded' }, { status: 400 });
  }
}
