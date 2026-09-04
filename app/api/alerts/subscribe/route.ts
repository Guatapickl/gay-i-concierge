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
  if (!rateLimit(`alerts:${id}`, 10, 60_000)) {
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
  const consent_source = (req.headers.get('referer')?.includes('/profile') ? 'profile' : 'alerts_page');
  const consent_ip = getClientId(req);

  if (wantsEmail) {
    const emailOk = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }
  if (wantsSms) {
    const phoneOk = !!phone && /^\+?[1-9]\d{7,14}$/.test(phone);
    if (!phoneOk) return NextResponse.json({ error: 'Valid E.164 phone number required.' }, { status: 400 });
  }

  // Ensure subscriber rows exist (but do not opt-in yet)
  if (wantsEmail && email) {
    try {
      await upsertSubscriber({ email }, { email_opt_in: false, user_id: user_id || null, consent_source, consent_ip });
    } catch (e) {
      console.error('Failed to upsert email subscriber:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
  }
  if (wantsSms && phone) {
    try {
      await upsertSubscriber({ phone }, { sms_opt_in: false, user_id: user_id || null, consent_source, consent_ip });
    } catch (e) {
      console.error('Failed to upsert SMS subscriber:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
  }

  // Create confirmation tokens (24h expiry)
  const tokens: { channel: 'email' | 'sms'; token: string }[] = [];
  if (wantsEmail && email) {
    try {
      const token = await createAlertToken({ action: 'subscribe', channel: 'email', email, ttlHours: 24 });
      tokens.push({ channel: 'email', token });
    } catch (e) {
      console.error('Failed to create email confirm token:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
  }
  if (wantsSms && phone) {
    try {
      const token = await createAlertToken({ action: 'subscribe', channel: 'sms', phone, ttlHours: 24 });
      tokens.push({ channel: 'sms', token });
    } catch (e) {
      console.error('Failed to create SMS confirm token:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
  }

  // In production, you would send email/SMS containing links to /alerts/confirm?token=...
  const debug = process.env.NODE_ENV !== 'production'
    ? { tokens }
    : undefined;
  return NextResponse.json({ ok: true, ...debug });
}
