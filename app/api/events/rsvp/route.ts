import { NextResponse, type NextRequest } from 'next/server';
import { adminDb, userFromRequest } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import {
  enqueueRsvpConfirmation,
  scheduleEventReminders,
} from '@/lib/reminders';
import { countRsvps, isAttending, parseRsvpStatus, rsvpStatusOf, type RsvpStatus } from '@/lib/rsvpStatus';

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

type RsvpRow = { id: string; event_id: string; profile_id: string; status?: unknown; created_at: string | null };

/* ─── GET  /api/events/rsvp?event_id=...&check=true ──────────────── */

/**
 * Query RSVPs for an event.
 *
 * Query params:
 *   event_id  (required)  — the event to query
 *   check     (optional)  — if "true", returns only the authenticated user's
 *                           answer ({ rsvped, status }) instead of the list
 *
 * The attendee list carries each member's answer. `count` is the number of
 * members going; `counts` breaks every answer down.
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
    // ── The current user's answer ──
    try {
      const snap = await db.collection('rsvps').doc(rsvpId(eventId, user.uid)).get();
      const status = snap.exists ? rsvpStatusOf(snap.data() ?? {}) : null;
      return NextResponse.json({ rsvped: isAttending(status), status });
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
    status: rsvpStatusOf(r) ?? 'yes',
    rsvped_at: r.created_at,
  }));
  const counts = countRsvps(rsvps);

  return NextResponse.json(
    { event_id: eventId, count: counts.yes, counts, attendees },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/* ─── POST  /api/events/rsvp  { event_id, status? } ──────────────── */

/**
 * Record the authenticated user's answer for an event: yes (default),
 * maybe or no. Answering again replaces the earlier answer. A confirmation
 * email goes out when a member says yes or maybe for the first time or
 * changes their answer; event reminders are scheduled for everyone who is
 * going or might go.
 */
export async function POST(req: NextRequest) {
  let body: { event_id?: string; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }
  const status: RsvpStatus | null = body.status === undefined ? 'yes' : parseRsvpStatus(body.status);
  if (!status) {
    return NextResponse.json({ error: 'status must be yes, maybe or no' }, { status: 400 });
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

  // Upsert the answer — idempotent thanks to the deterministic doc id
  let previous: RsvpStatus | null = null;
  try {
    const ref = db.collection('rsvps').doc(rsvpId(body.event_id, user.uid));
    const existing = await ref.get();
    const now = new Date().toISOString();
    if (existing.exists) {
      previous = rsvpStatusOf(existing.data() ?? {});
      if (previous !== status) await ref.update(adminPayloadOf({ status, updated_at: now }));
    } else {
      await ref.set(
        adminPayloadOf({
          profile_id: user.uid,
          event_id: body.event_id,
          event_date: event.event_datetime,
          status,
          created_at: now,
          updated_at: now,
        }),
      );
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'insert failed' }, { status: 400 });
  }

  // Side-effects — best-effort, never fail the RSVP for email issues
  const changed = previous !== status;
  await Promise.allSettled([
    changed && isAttending(status)
      ? enqueueRsvpConfirmation({ eventId: body.event_id, userId: user.uid, status })
      : Promise.resolve(false),
    isAttending(status) ? scheduleEventReminders(body.event_id) : Promise.resolve(null),
  ]);

  return NextResponse.json({ ok: true, event_id: body.event_id, profile_id: user.uid, status, previous_status: previous });
}

/* ─── DELETE  /api/events/rsvp?event_id=...  ─────────────────────── */

/**
 * Withdraw the authenticated user's answer for an event.
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
