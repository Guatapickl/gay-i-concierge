import { NextResponse } from 'next/server';
import { adminDb, userFromRequest } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import { enqueueRsvpConfirmation, scheduleEventReminders } from '@/lib/reminders';

export const runtime = 'nodejs';

/**
 * Authenticated RSVP endpoint that wraps the database insert with email
 * side-effects (confirmation + reminder scheduling). Clients can keep using
 * the direct RSVP path; calling this route just adds the emails.
 */
export async function POST(req: Request) {
  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  if (!req.headers.get('authorization')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = user.uid;

  try {
    const db = adminDb();
    const ref = db.collection('rsvps').doc(`${body.event_id}_${userId}`);
    const existing = await ref.get();
    if (!existing.exists) {
      // Postgres filled event_date via trigger/default; mirror it from the event when available.
      const eventSnap = await db.collection('events').doc(body.event_id).get();
      const event = eventSnap.exists ? adminRowOf<{ event_datetime: string | null }>(eventSnap) : null;
      await ref.set(
        adminPayloadOf({
          profile_id: userId,
          event_id: body.event_id,
          event_date: event?.event_datetime ?? null,
          created_at: new Date().toISOString(),
        }),
      );
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'insert failed' }, { status: 400 });
  }

  // Side effects — best-effort, never fail the RSVP for email issues
  await Promise.allSettled([
    enqueueRsvpConfirmation({ eventId: body.event_id, userId }),
    scheduleEventReminders(body.event_id),
  ]);

  return NextResponse.json({ ok: true });
}
