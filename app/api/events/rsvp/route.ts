import { NextResponse, type NextRequest } from 'next/server';
import { adminDb, userFromRequest } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import {
  enqueueRsvpConfirmation,
  scheduleEventReminders,
} from '@/lib/reminders';

export const runtime = 'nodejs';

/* ─── helpers ─────────────────────────────────────────────────────── */

/** rsvps doc id — mirrors the Postgres (event_id, profile_id) unique key. */
const rsvpId = (eventId: string, userId: string) => `${eventId}_${userId}`;

/** Firestore `in` accepts ≤30 values. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type RsvpRow = { id: string; event_id: string; profile_id: string; created_at: string | null };

/* ─── GET  /api/events/rsvp?event_id=...&check=true ──────────────── */

/**
 * Query RSVPs for an event.
 *
 * Query params:
 *   event_id  (required)  — the event to query
 *   check     (optional)  — if "true", returns only { rsvped: boolean } for
 *                           the authenticated user instead of the attendee list
 */
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id query param required' }, { status: 400 });
  }

  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  const checkOnly = req.nextUrl.searchParams.get('check') === 'true';
  const db = adminDb();

  if (checkOnly) {
    // ── Check if the current user has RSVPed ──
    try {
      const snap = await db.collection('rsvps').doc(rsvpId(eventId, user.uid)).get();
      return NextResponse.json({ rsvped: snap.exists });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'lookup failed' }, { status: 500 });
    }
  }

  // ── Attendee list for authenticated members ──
  let rsvps: RsvpRow[];
  try {
    const snap = await db
      .collection('rsvps')
      .where('event_id', '==', eventId)
      .orderBy('created_at', 'asc')
      .get();
    rsvps = snap.docs.map(d => adminRowOf<RsvpRow>(d));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'lookup failed' }, { status: 500 });
  }

  // Hydrate with profile names for the attendee list
  const profileIds = rsvps.map(r => r.profile_id);
  const profileMap: Record<string, string | null> = {};
  if (profileIds.length > 0) {
    for (const ids of chunk(profileIds)) {
      const snap = await db.collection('profiles').where('__name__', 'in', ids).get();
      for (const d of snap.docs) {
        profileMap[d.id] = ((d.data() as { name?: string | null }).name as string) || null;
      }
    }
  }

  const attendees = rsvps.map(r => ({
    id: r.id,
    profile_id: r.profile_id,
    name: profileMap[r.profile_id] ?? null,
    rsvped_at: r.created_at,
  }));

  return NextResponse.json({ event_id: eventId, count: attendees.length, attendees }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/* ─── POST  /api/events/rsvp  { event_id } ───────────────────────── */

/**
 * Create an RSVP for the authenticated user. Enqueues a confirmation email
 * and schedules event reminders as side-effects (best-effort).
 */
export async function POST(req: NextRequest) {
  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = adminDb();

  // Verify event exists
  const eventSnap = await db.collection('events').doc(body.event_id).get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 });
  }
  const event = adminRowOf<{ id: string; event_datetime: string | null }>(eventSnap);

  // Insert RSVP row — idempotent thanks to the deterministic doc id
  try {
    const ref = db.collection('rsvps').doc(rsvpId(body.event_id, user.uid));
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set(
        adminPayloadOf({
          profile_id: user.uid,
          event_id: body.event_id,
          event_date: event.event_datetime,
          created_at: new Date().toISOString(),
        }),
      );
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'insert failed' }, { status: 400 });
  }

  // Side-effects — best-effort, never fail the RSVP for email issues
  await Promise.allSettled([
    enqueueRsvpConfirmation({ eventId: body.event_id, userId: user.uid }),
    scheduleEventReminders(body.event_id),
  ]);

  return NextResponse.json({ ok: true, event_id: body.event_id, profile_id: user.uid });
}

/* ─── DELETE  /api/events/rsvp?event_id=...  ─────────────────────── */

/**
 * Cancel an RSVP for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id query param required' }, { status: 400 });
  }

  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await adminDb().collection('rsvps').doc(rsvpId(eventId, user.uid)).delete();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event_id: eventId });
}
