import { NextResponse } from 'next/server';
import { getClientId, rateLimit } from '@/lib/rateLimit';
import { createAlertToken, upsertSubscriber } from '../_lib';

export const runtime = 'nodejs';

type Payload = {
  email?: string;
  phone?: string;
  channels?: Array<'email' | 'sms'>;
  user_id?: string;
};

export async function POST(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`alerts-unsub:${id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const channels = Array.isArray(body.channels) ? body.channels : [];
  const wantsEmail = channels.includes('email');
  const wantsSms = channels.includes('sms');
  if (!wantsEmail && !wantsSms) {
    return NextResponse.json({ error: 'Select at least one channel.' }, { status: 400 });
  }

  const email = body.email?.trim();
  const phone = body.phone?.trim();
  const user_id = body.user_id?.trim();
  const consent_source = (req.headers.get('referer')?.includes('/profile') ? 'profile' : 'unsubscribe_page');
  const consent_ip = getClientId(req);

  if (wantsEmail) {
    const emailOk = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return NextResponse.json({ error: 'Valid email required to unsubscribe email.' }, { status: 400 });
  }
  if (wantsSms) {
    const phoneOk = !!phone && /^\+?[1-9]\d{7,14}$/.test(phone);
    if (!phoneOk) return NextResponse.json({ error: 'Valid E.164 phone required to unsubscribe SMS.' }, { status: 400 });
  }

  // Create confirmation tokens (2h expiry) instead of immediate opt-out
  const tokens: { channel: 'email' | 'sms'; token: string }[] = [];
  if (wantsEmail && email) {
    try {
      const token = await createAlertToken({ action: 'unsubscribe', channel: 'email', email, ttlHours: 2 });
      tokens.push({ channel: 'email', token });
    } catch (e) {
      console.error('Create token failed:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Failed to create unsubscribe token.' }, { status: 500 });
    }
  }
  if (wantsSms && phone) {
    try {
      const token = await createAlertToken({ action: 'unsubscribe', channel: 'sms', phone, ttlHours: 2 });
      tokens.push({ channel: 'sms', token });
    } catch (e) {
      console.error('Create token failed:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Failed to create unsubscribe token.' }, { status: 500 });
    }
  }

  // Optionally record intent (not final consent) on subscriber record — best-effort
  try {
    if (wantsEmail && email) {
      await upsertSubscriber({ email }, { user_id: user_id || null, consent_source, consent_ip });
    }
    if (wantsSms && phone) {
      await upsertSubscriber({ phone }, { user_id: user_id || null, consent_source, consent_ip });
    }
  } catch (e) {
    console.warn('Recording unsubscribe intent failed:', e instanceof Error ? e.message : e);
  }

  const debug = process.env.NODE_ENV !== 'production' ? { tokens } : undefined;
  return NextResponse.json({ ok: true, ...debug });
}
