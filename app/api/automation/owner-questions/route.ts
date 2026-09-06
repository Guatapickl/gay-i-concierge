import { NextResponse } from 'next/server';
import { automationAuthorized, ownerQuestions } from '@/lib/meeting-automation';
import { tieOwnerQuestions } from '@/lib/poll-outcomes';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  if (!automationAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ requests: [...await tieOwnerQuestions(), ...await ownerQuestions()].slice(0, 20) }, { headers: { 'Cache-Control': 'no-store' } });
}
