import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { pollInviteEmail, pollResultEmail } from '@/lib/emailTemplates';
import type { Event } from '@/types/supabase';

export const runtime = 'nodejs';

/**
 * Admin-only. Queues poll emails into `email_reminders` so the existing
 * reminder cron delivers them (Resend transport, retries, audit trail).
 *
 *   { type: 'invite' }  → every opted-in email subscriber gets "rank the dates"
 *   { type: 'result' }  → every opted-in subscriber gets the booked meeting
 *
 * Idempotent per (poll, recipient, type): re-running never double-sends.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: pollId } = await ctx.params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { count: adminCount } = await admin
    .from('app_admins')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (!adminCount) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: { type?: 'invite' | 'result' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const type = body.type === 'result' ? 'result' : 'invite';

  const { data: poll } = await admin.from('meeting_polls').select('*').eq('id', pollId).single();
  if (!poll) return NextResponse.json({ error: 'poll not found' }, { status: 404 });

  let subject: string;
  let html: string;
  let text: string;
  let eventId: string | null = null;
  if (type === 'invite') {
    if (poll.status !== 'open') return NextResponse.json({ error: 'poll is closed' }, { status: 400 });
    const { data: options } = await admin
      .from('meeting_poll_options')
      .select('*')
      .eq('poll_id', pollId)
      .order('sort_order', { ascending: true });
    ({ subject, html, text } = pollInviteEmail(poll, options || []));
  } else {
    if (!poll.event_id) return NextResponse.json({ error: 'poll has no booked meeting yet' }, { status: 400 });
    const { data: event } = await admin.from('events').select('*').eq('id', poll.event_id).single();
    if (!event) return NextResponse.json({ error: 'linked event not found' }, { status: 404 });
    eventId = event.id as string;
    ({ subject, html, text } = pollResultEmail(poll, event as Event));
  }

  // Recipients: every member who opted into club email.
  const { data: subs } = await admin
    .from('alerts_subscribers')
    .select('email, user_id')
    .eq('email_opt_in', true)
    .not('email', 'is', null);
  const recipients = (subs || []).filter(s => !!s.email) as { email: string; user_id: string | null }[];
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, skipped: 0, note: 'no opted-in email subscribers' });
  }

  const kind = type === 'invite' ? 'poll_invite' : 'poll_result';
  const marker = `poll:${pollId}:${kind}`;
  const { data: already } = await admin
    .from('email_reminders')
    .select('recipient_email')
    .eq('kind', kind)
    .eq('subject', subject)
    .in('recipient_email', recipients.map(r => r.email));
  const done = new Set((already || []).map(r => r.recipient_email as string));

  const rows = recipients
    .filter(r => !done.has(r.email))
    .map(r => ({
      event_id: eventId,
      recipient_email: r.email,
      recipient_user_id: r.user_id,
      kind,
      subject,
      body_html: html,
      body_text: `${text}\n\n[${marker}]`,
      send_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await admin.from('email_reminders').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, queued: rows.length, skipped: done.size });
}
