import { NextResponse } from 'next/server';
import { automationAuthorized, ownerQuestions } from '@/lib/meeting-automation';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  if (!automationAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ requests: await ownerQuestions() }, { headers: { 'Cache-Control': 'no-store' } });
}
