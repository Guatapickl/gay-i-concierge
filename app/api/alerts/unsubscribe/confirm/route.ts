import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit, getClientId } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`alerts-unsub-confirm:${id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const { data: rows, error } = await getSupabaseAdmin()
    .from('alerts_confirmations')
    .select('*')
    .eq('token', token)
    .is('consumed_at', null)
    .limit(1);
  if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const row = rows?.[0];
  if (!row) return NextResponse.json({ error: 'Invalid or used token' }, { status: 400 });
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 });
  }
  if (row.action !== 'unsubscribe') return NextResponse.json({ error: 'Wrong token action' }, { status: 400 });

  if (row.channel === 'email' && row.email) {
    const { error: upErr } = await getSupabaseAdmin()
      .from('alerts_subscribers')
      .update({ email_opt_in: false })
      .eq('email', row.email);
    if (upErr) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  } else if (row.channel === 'sms' && row.phone) {
    const { error: upErr } = await getSupabaseAdmin()
      .from('alerts_subscribers')
      .update({ sms_opt_in: false })
      .eq('phone', row.phone);
    if (upErr) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'Token incomplete' }, { status: 400 });
  }

  await getSupabaseAdmin()
    .from('alerts_confirmations')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token', token);

  return NextResponse.json({ ok: true });
}
