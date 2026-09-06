import { NextResponse } from 'next/server';
import { automationAuthorized } from '@/lib/meeting-automation';
import { runPollOutcomes } from '@/lib/poll-outcomes';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  if (!automationAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const result = await runPollOutcomes();
  return NextResponse.json(result, { status: result.errors.length ? 500 : 200 });
}
