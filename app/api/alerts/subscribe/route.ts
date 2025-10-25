import { NextResponse } from 'next/server';
import { getClientId, rateLimit } from '@/lib/rateLimit';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateToken, expiresIn } from '@/lib/tokens';

export const runtime = 'nodejs';

type Payload = {
  email?: string;
  phone?: string;
  channels?: Array<'email' | 'sms'>;
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
    const { error } = await getSupabaseAdmin()
      .from('alerts_subscribers')
      .upsert({ email, email_opt_in: false }, { onConflict: 'email' });
    if (error) {
      console.error('Failed to upsert email subscriber:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
  }
  if (wantsSms && phone) {
    const { error } = await getSupabaseAdmin()
      .from('alerts_subscribers')
      .upsert({ phone, sms_opt_in: false }, { onConflict: 'phone' });
    if (error) {
      console.error('Failed to upsert SMS subscriber:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
  }

  // Create confirmation tokens (24h expiry)
  const tokens: { channel: 'email' | 'sms'; token: string }[] = [];
  if (wantsEmail && email) {
    const token = generateToken();
    const { error } = await getSupabaseAdmin().from('alerts_confirmations').insert([
      { token, action: 'subscribe', channel: 'email', email, expires_at: expiresIn(24) },
    ]);
    if (error) {
      console.error('Failed to create email confirm token:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
    tokens.push({ channel: 'email', token });
  }
  if (wantsSms && phone) {
    const token = generateToken();
    const { error } = await getSupabaseAdmin().from('alerts_confirmations').insert([
      { token, action: 'subscribe', channel: 'sms', phone, expires_at: expiresIn(24) },
    ]);
    if (error) {
      console.error('Failed to create SMS confirm token:', error.message);
      return NextResponse.json({ error: 'Failed to subscribe.' }, { status: 500 });
    }
    tokens.push({ channel: 'sms', token });
  }

  // In production, you would send email/SMS containing links to /alerts/confirm?token=...
  const debug = process.env.NODE_ENV !== 'production'
    ? { tokens }
    : undefined;
  return NextResponse.json({ ok: true, ...debug });
}
