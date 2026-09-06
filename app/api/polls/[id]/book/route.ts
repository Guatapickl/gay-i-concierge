import { NextResponse } from 'next/server';
import { userFromRequest, isAdminUid } from '@/lib/firebase/admin';
import { PollActionError } from '@/lib/poll-ballots';
import { bookPoll } from '@/lib/poll-outcomes';
export const runtime = 'nodejs';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Sign in to book a meeting.' }, { status: 401 });
  if (!await isAdminUid(user.uid)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const raw = await req.text();
    if (raw.length > 20000) throw new PollActionError('Request too large.', 413);
    return NextResponse.json(await bookPoll((await ctx.params).id, user.uid, JSON.parse(raw)));
  } catch (error) {
    if (error instanceof PollActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid booking request.' }, { status: 400 });
    console.error('Poll booking failed', error);
    return NextResponse.json({ error: 'Could not book this meeting.' }, { status: 500 });
  }
}
