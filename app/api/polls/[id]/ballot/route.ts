import { NextResponse } from 'next/server';
import { userFromRequest } from '@/lib/firebase/admin';
import { PollActionError, savePollBallot } from '@/lib/poll-ballots';
export const runtime = 'nodejs';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Sign in to vote.' }, { status: 401 });
  try {
    const raw = await req.text();
    if (raw.length > 20000) throw new PollActionError('Response too large.', 413);
    return NextResponse.json(await savePollBallot((await ctx.params).id, user.uid, JSON.parse(raw)));
  } catch (error) {
    if (error instanceof PollActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid response.' }, { status: 400 });
    console.error('Ballot could not be saved', error);
    return NextResponse.json({ error: 'Could not save your response. Your previous ballot has been kept.' }, { status: 500 });
  }
}
