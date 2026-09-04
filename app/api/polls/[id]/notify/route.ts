import { NextResponse } from 'next/server';
import { adminDb, isAdminUid, userFromRequest } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import { pollInviteEmail, pollResultEmail } from '@/lib/emailTemplates';
import type { Event, MeetingPoll, MeetingPollOption } from '@/types/supabase';

export const runtime = 'nodejs';

/** Firestore `in` accepts ≤30 values. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

  if (!req.headers.get('authorization')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isAdminUid(user.uid))) return NextResponse.json({ error: 'admin only' }, { status: 403 });

  let body: { type?: 'invite' | 'result' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const type = body.type === 'result' ? 'result' : 'invite';

  const db = adminDb();
  const pollSnap = await db.collection('meeting_polls').doc(pollId).get();
  if (!pollSnap.exists) return NextResponse.json({ error: 'poll not found' }, { status: 404 });
  const poll = adminRowOf<MeetingPoll>(pollSnap);

  let subject: string;
  let html: string;
  let text: string;
  let eventId: string | null = null;
  if (type === 'invite') {
    if (poll.status !== 'open') return NextResponse.json({ error: 'poll is closed' }, { status: 400 });
    const optSnap = await db
      .collection('meeting_poll_options')
      .where('poll_id', '==', pollId)
      .orderBy('sort_order', 'asc')
      .get();
    const options = optSnap.docs.map(d => adminRowOf<MeetingPollOption>(d));
    ({ subject, html, text } = pollInviteEmail(poll, options));
  } else {
    if (!poll.event_id) return NextResponse.json({ error: 'poll has no booked meeting yet' }, { status: 400 });
    const eventSnap = await db.collection('events').doc(poll.event_id).get();
    if (!eventSnap.exists) return NextResponse.json({ error: 'linked event not found' }, { status: 404 });
    const event = adminRowOf<Event>(eventSnap);
    eventId = event.id;
    ({ subject, html, text } = pollResultEmail(poll, event));
  }

  // Recipients: every member who opted into club email.
  const subSnap = await db.collection('alerts_subscribers').where('email_opt_in', '==', true).get();
  const recipients = subSnap.docs
    .map(d => d.data() as { email?: string | null; user_id?: string | null })
    .filter(s => !!s.email)
    .map(s => ({ email: s.email as string, user_id: s.user_id ?? null }));
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, queued: 0, skipped: 0, note: 'no opted-in email subscribers' });
  }

  const kind = type === 'invite' ? 'poll_invite' : 'poll_result';
  const marker = `poll:${pollId}:${kind}`;
  const done = new Set<string>();
  for (const emails of chunk(recipients.map(r => r.email))) {
    const snap = await db
      .collection('email_reminders')
      .where('kind', '==', kind)
      .where('subject', '==', subject)
      .where('recipient_email', 'in', emails)
      .get();
    for (const d of snap.docs) done.add((d.data() as { recipient_email: string }).recipient_email);
  }

  const now = new Date().toISOString();
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
      send_at: now,
      // Postgres column defaults, made explicit for Firestore:
      sent_at: null,
      status: 'pending',
      error: null,
      attempts: 0,
      created_at: now,
    }));

  if (rows.length > 0) {
    try {
      const col = db.collection('email_reminders');
      for (const part of chunk(rows, 400)) {
        const batch = db.batch();
        for (const row of part) batch.set(col.doc(), adminPayloadOf(row));
        await batch.commit();
      }
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'queue failed' }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, queued: rows.length, skipped: done.size });
}
