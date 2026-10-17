import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminUid, userFromRequest } from '@/lib/firebase/admin';
import { MeetingReminderError, sendMeetingReminder } from '@/lib/meetingReminders';
import { processDueReminders } from '@/lib/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ─── POST /api/events/remind  (organizers only) ───────────────────── */

/**
 * Send (or preview) a reminder email about an upcoming meeting to everyone
 * who has signed up at gayiclub.com.
 *
 * Body (all optional):
 *   event_id   which meeting; defaults to the next upcoming one
 *   note       organizer's message, shown at the top of the email
 *   dry_run    true → report who would receive it, queue nothing
 *   resend     true → include members who already got a reminder for this meeting
 *
 * Auth: a signed-in organizer (`Authorization: Bearer <idToken>` and listed
 * in `app_admins`), or automation with `Authorization: Bearer <CRON_SECRET>`.
 *
 * Queued rows are drained right away, so the response reports how many were
 * actually handed to the email provider. Anything that fails stays in the
 * queue for the reminder cron to retry.
 */

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const NOTE_MAX = 2000;

type Body = { event_id?: unknown; note?: unknown; dry_run?: unknown; resend?: unknown };

function bearer(req: Request): string | null {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7) : null;
}

function isCronCaller(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const token = bearer(req);
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function authorize(req: Request): Promise<{ ok: true; by: string } | { ok: false; status: number; error: string }> {
  const user = await userFromRequest(req);
  if (user) {
    if (await isAdminUid(user.uid)) return { ok: true, by: user.email ?? user.uid };
    return { ok: false, status: 403, error: 'forbidden: organizers only' };
  }
  if (isCronCaller(req)) return { ok: true, by: 'automation' };
  return { ok: false, status: 401, error: 'unauthorized' };
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });

  let body: Body = {};
  const raw = await req.text();
  if (raw.trim()) {
    try {
      body = JSON.parse(raw) as Body;
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400, headers: NO_STORE });
    }
  }
  const eventId = typeof body.event_id === 'string' && body.event_id.trim() ? body.event_id.trim() : null;
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > NOTE_MAX) {
    return NextResponse.json({ error: `note is too long (max ${NOTE_MAX} characters)` }, { status: 400, headers: NO_STORE });
  }
  const dryRun = body.dry_run === true;
  const resend = body.resend === true;

  try {
    const result = await sendMeetingReminder({ eventId, note, dryRun, resend, requestedBy: auth.by });
    const delivery = result.queued > 0 ? await processDueReminders(Math.min(200, result.queued)) : null;
    return NextResponse.json(
      {
        ok: true,
        ...result,
        // Recipient addresses stay server-side; the organizer sees counts.
        recipients: result.recipients.map(r => ({ user_id: r.user_id, has_rsvped: r.has_rsvped })),
        recipient_count: result.recipients.length,
        delivery,
        generated_at: new Date().toISOString(),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    if (e instanceof MeetingReminderError) {
      return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'reminder failed' },
      { status: 500, headers: NO_STORE },
    );
  }
}
