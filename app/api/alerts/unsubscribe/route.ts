import { NextResponse } from 'next/server';
import { getClientId, rateLimit } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateToken, expiresIn } from '@/lib/tokens';

export const runtime = 'nodejs';

type Payload = {
  email?: string;
  phone?: string;
  channels?: Array<'email' | 'sms'>;
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
    const token = generateToken();
    const { error } = await supabaseAdmin.from('alerts_confirmations').insert([
      { token, action: 'unsubscribe', channel: 'email', email, expires_at: expiresIn(2) },
    ]);
    if (error) {
      console.error('Create token failed:', error.message);
      return NextResponse.json({ error: 'Failed to create unsubscribe token.' }, { status: 500 });
    }
    tokens.push({ channel: 'email', token });
  }
  if (wantsSms && phone) {
    const token = generateToken();
    const { error } = await supabaseAdmin.from('alerts_confirmations').insert([
      { token, action: 'unsubscribe', channel: 'sms', phone, expires_at: expiresIn(2) },
    ]);
    if (error) {
      console.error('Create token failed:', error.message);
      return NextResponse.json({ error: 'Failed to create unsubscribe token.' }, { status: 500 });
    }
    tokens.push({ channel: 'sms', token });
  }

  const debug = process.env.NODE_ENV !== 'production' ? { tokens } : undefined;
  return NextResponse.json({ ok: true, ...debug });
}
