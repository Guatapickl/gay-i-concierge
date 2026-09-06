import { NextResponse } from 'next/server';
import { userFromRequest } from '@/lib/firebase/admin';
import { getRobotVotes, saveRobotVote, validateRobotVote } from '@/lib/robot-votes';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'Sign in to view showcase votes.' }, 401);
  try { return json(await getRobotVotes(user.uid)); }
  catch (error) { console.error('Showcase votes could not be loaded', error); return json({ error: 'Votes could not be loaded. Please try again.' }, 500); }
}
export async function PUT(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'Sign in to vote.' }, 401);
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: 'Request too large.' }, 413);
    input = validateRobotVote(JSON.parse(raw));
  } catch { return json({ error: 'Choose a showcase example and a vote.' }, 400); }
  try { return json(await saveRobotVote(user.uid, input)); }
  catch (error) { console.error('Showcase vote could not be saved', error); return json({ error: 'Could not confirm your vote. Refresh the votes before trying again.' }, 500); }
}
