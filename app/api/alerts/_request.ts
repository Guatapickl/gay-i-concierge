import { NextResponse } from 'next/server';
import { getClientId, rateLimit } from '@/lib/rateLimit';
import { userFromRequest, adminDb } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email';
import { createAlertToken, type Action } from './_lib';

/** Changes consent only after the recipient follows the emailed confirmation. */
export async function requestAlertChange(req: Request, action: Action) {
  if (!rateLimit(`alerts-${action}:${getClientId(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const channels = Array.isArray(body.channels) ? body.channels : [];
  if (channels.includes('sms')) return NextResponse.json({ error: 'SMS alerts are not available. Please choose email.' }, { status: 422 });
  if (!channels.includes('email') || channels.some(channel => channel !== 'email')) {
    return NextResponse.json({ error: 'Select email alerts.' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  // Console delivery is not email delivery; never report success without a provider.
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email alerts are temporarily unavailable. Please try again later.' }, { status: 503 });
  let token: string | undefined;
  try {
    const user = await userFromRequest(req);
    token = await createAlertToken({ action, channel: 'email', email, ttlHours: action === 'subscribe' ? 24 : 2,
      user_id: user?.email?.toLowerCase() === email ? user.uid : null });
    const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gayiclub.com');
    const path = action === 'subscribe' ? '/alerts/confirm' : '/alerts/unsubscribe/confirm';
    const link = new URL(path, base);
    link.searchParams.set('token', token);
    const label = action === 'subscribe' ? 'Confirm email alerts' : 'Confirm unsubscribe';
    const text = `${label}: ${link.href}\n\nIf you did not request this, ignore this email. Your preferences have not changed.`;
    const sent = await sendEmail({ to: email, subject: label, text, html: `<p>${label}</p><p><a href="${link.href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${label}</a></p><p>If you did not request this, ignore this email. Your preferences have not changed.</p>` });
    if (!sent.ok || sent.provider !== 'resend') throw new Error('Email delivery failed');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (token) await adminDb().collection('alerts_confirmations').doc(token).delete().catch(() => {});
    return NextResponse.json({ error: 'Could not send the confirmation email. Please try again later.' }, { status: 503 });
  }
}
