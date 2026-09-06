import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { publicRequestUrl } from '@/lib/publicRequestUrl';
import { createSessionCookie, SESSION_COOKIE } from '@/lib/firebase/session';

export const runtime = 'nodejs';

/**
 * Firebase session bridge (replaces Supabase's cookie-refreshing middleware).
 * POST { idToken } after sign-in → sets the __session cookie for SSR.
 * DELETE on sign-out → clears it.
 */
function isSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const publicUrl = publicRequestUrl(req);
  return (!origin || origin === publicUrl.origin) && req.headers.get('sec-fetch-site') !== 'cross-site';
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({error:'Forbidden origin'}, {status:403});
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.idToken) return NextResponse.json({ error: 'idToken required' }, { status: 400 });
  try {
    const cookie = await createSessionCookie(body.idToken);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 14 * 24 * 60 * 60,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'session failed' }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({error:'Forbidden origin'}, {status:403});
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
