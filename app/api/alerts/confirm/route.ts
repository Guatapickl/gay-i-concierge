import { NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { consumeAlertToken } from '../_lib';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`alerts-confirm:${id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  let result;
  try {
    result = await consumeAlertToken({
      token,
      expectedAction: 'subscribe',
      consent_ip: getClientId(req),
      consent_source: 'confirm',
    });
  } catch (e) {
    console.error('alerts confirm failed:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
