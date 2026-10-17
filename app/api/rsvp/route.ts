import { NextResponse } from 'next/server';
import { adminDb, userFromRequest } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import { enqueueRsvpConfirmation, scheduleEventReminders } from '@/lib/reminders';
import { isAttending, parseRsvpStatus, rsvpStatusOf } from '@/lib/rsvpStatus';

export const runtime = 'nodejs';

/**
 * Authenticated RSVP endpoint that wraps the database insert with email
 * side-effects (confirmation + reminder scheduling). Clients can keep using
 * the direct RSVP path; calling this route just adds the emails.
 */
export async function POST(req: Request) {
  let body: { event_id?: string; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }
  const status = body.status === undefined ? 'yes' : parseRsvpStatus(body.status);
  if (!status) {
    return NextResponse.json({ error: 'status must be yes, maybe or no' }, { status: 400 });
  }

  if (!req.headers.get('authorization')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = user.uid;

  let changed = true;
  try {
    const db = adminDb();
    const ref = db.collection('rsvps').doc(`${body.event_id}_${userId}`);
    const existing = await ref.get();
    const now = new Date().toISOString();
    if (existing.exists) {
      changed = rsvpStatusOf(existing.data() ?? {}) !== status;
      if (changed) await ref.update(adminPayloadOf({ status, updated_at: now }));
    } else {
      // Postgres filled event_date via trigger/default; mirror it from the event when available.
      const eventSnap = await db.collection('events').doc(body.event_id).get();
      const event = eventSnap.exists ? adminRowOf<{ event_datetime: string | null }>(eventSnap) : null;
      await ref.set(
        adminPayloadOf({
          profile_id: userId,
          event_id: body.event_id,
          event_date: event?.event_datetime ?? null,
          status,
          created_at: now,
          updated_at: now,
        }),
      );
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'insert failed' }, { status: 400 });
  }

  // Side effects — best-effort, never fail the RSVP for email issues
  await Promise.allSettled([
    changed && isAttending(status)
      ? enqueueRsvpConfirmation({ eventId: body.event_id, userId, status })
      : Promise.resolve(false),
    isAttending(status) ? scheduleEventReminders(body.event_id) : Promise.resolve(null),
  ]);

  return NextResponse.json({ ok: true, status });
}
