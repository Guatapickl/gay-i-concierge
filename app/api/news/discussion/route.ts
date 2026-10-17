import { NextResponse } from 'next/server';
import { callerFromRequest } from '@/app/api/_lib/caller';
import {
  listNewsDiscussion,
  NewsDiscussionError,
  parseNewsIdList,
  saveNewsDiscussionVote,
  validateNewsDiscussionVote,
} from '@/lib/news-discussion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/**
 * GET /api/news/discussion[?ids=a,b,c][&agendas=1]
 * Signed-in members get vote totals and their own choice per story, never
 * voter identities. `ids` limits the answer to the stories the feed shows;
 * `agendas=1` adds where each story already sits on a meeting agenda.
 */
export async function GET(req: Request) {
  const user = await callerFromRequest(req);
  if (!user) return json({ error: 'Sign in to see who wants to talk about a story.' }, 401);
  const url = new URL(req.url);
  let ids: string[] | null;
  try {
    ids = parseNewsIdList(url.searchParams.get('ids'));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid request.' }, 400);
  }
  try {
    return json(await listNewsDiscussion(user.uid, { ids, includeAgendas: url.searchParams.get('agendas') === '1' }));
  } catch (error) {
    console.error('Discussion votes could not be loaded', error);
    return json({ error: 'Discussion votes could not be loaded. Please try again.' }, 500);
  }
}

/**
 * PUT /api/news/discussion  { newsId, voted }
 * Saves the desired state for the caller, so a retried request is harmless.
 */
export async function PUT(req: Request) {
  const user = await callerFromRequest(req);
  if (!user) return json({ error: 'Sign in to vote.' }, 401);
  let input: { newsId: string; voted: boolean };
  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: 'Request too large.' }, 413);
    input = validateNewsDiscussionVote(JSON.parse(raw));
  } catch {
    return json({ error: 'Choose a story and a vote.' }, 400);
  }
  try {
    return json(await saveNewsDiscussionVote(user.uid, input));
  } catch (error) {
    if (error instanceof NewsDiscussionError) return json({ error: error.message }, error.status);
    console.error('Discussion vote could not be saved', error);
    return json({ error: 'Could not save your vote. Refresh and try again.' }, 500);
  }
}
