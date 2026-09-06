import { NextResponse } from 'next/server';
import { automationAuthorized, runMeetingAutomation } from '@/lib/meeting-automation';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  if (!automationAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await runMeetingAutomation());
}
