import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { adminAuth, adminDb, isAdminUid, userFromRequest } from '@/lib/firebase/admin';
import { adminRowOf } from '@/lib/firebase/adminDb';

export const runtime = 'nodejs';

/* ─── GET  /api/events/attendees?event_id=...  (organizers only) ──── */

/**
 * Organizer view of who has RSVP'd to the next meeting.
 *
 * - Caller must be signed in (401) and listed in `app_admins` (403); both
 *   checks run server-side before any RSVP data is read.
 * - Without `event_id`, the "next meeting" is the earliest event whose
 *   `event_datetime` is still in the future (the dashboard's "Next meetup"
 *   convention). With `event_id`, that event is shown instead, and
 *   `is_next_meeting` says whether it is also the next one.
 * - Names come from `user_profiles.full_name`, then the Firebase Auth display
 *   name. A sign-in email is included only when neither exists, so the
 *   organizer can still tell who the RSVP belongs to; contact details are
 *   otherwise left out of the response.
 * - Every failure is an error status. The response never turns a lookup
 *   problem into an empty attendee list.
 */

const UPCOMING_LIMIT = 12;
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export type MeetingSummaryRecord = {
  id: string;
  title: string;
  event_datetime: string | null;
  location: string | null;
};

export type MeetingAttendeeRecord = {
  id: string;
  profile_id: string;
  name: string | null;
  email: string | null;
  rsvped_at: string | null;
};

type EventRow = MeetingSummaryRecord & Record<string, unknown>;
type RsvpRow = { id: string; event_id: string; profile_id: string; created_at: string | null };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function summarize(row: EventRow): MeetingSummaryRecord {
  return {
    id: row.id,
    title: typeof row.title === 'string' ? row.title : '',
    event_datetime: row.event_datetime ?? null,
    location: typeof row.location === 'string' ? row.location : null,
  };
}

async function loadAttendees(db: Firestore, eventId: string): Promise<MeetingAttendeeRecord[]> {
  const snap = await db
    .collection('rsvps')
    .where('event_id', '==', eventId)
    .orderBy('created_at', 'asc')
    .get();
  const rsvps = snap.docs.map(d => adminRowOf<RsvpRow>(d));
  const uids = Array.from(new Set(rsvps.map(r => r.profile_id).filter(Boolean)));

  const names = new Map<string, string>();
  const emails = new Map<string, string>();
  if (uids.length > 0) {
    const profiles = await db.getAll(...uids.map(uid => db.collection('user_profiles').doc(uid)));
    for (const profile of profiles) {
      const data = profile.exists ? profile.data() ?? {} : {};
      const fullName = typeof data.full_name === 'string' ? data.full_name.trim() : '';
      if (fullName) names.set(profile.id, fullName);
      const email = typeof data.email === 'string' ? data.email.trim() : '';
      if (email) emails.set(profile.id, email);
    }
    const unnamed = uids.filter(uid => !names.has(uid));
    for (const part of chunk(unnamed, 100)) {
      const result = await adminAuth().getUsers(part.map(uid => ({ uid })));
      for (const record of result.users) {
        const displayName = record.displayName?.trim();
        if (displayName) names.set(record.uid, displayName);
        if (record.email && !emails.has(record.uid)) emails.set(record.uid, record.email);
      }
    }
  }

  return rsvps.map(r => {
    const name = names.get(r.profile_id) ?? null;
    return {
      id: r.id,
      profile_id: r.profile_id,
      name,
      email: name ? null : emails.get(r.profile_id) ?? null,
      rsvped_at: r.created_at ?? null,
    };
  });
}

export async function GET(req: NextRequest) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  if (!(await isAdminUid(user.uid))) {
    return NextResponse.json({ error: 'forbidden: organizers only' }, { status: 403, headers: NO_STORE });
  }

  const requestedId = req.nextUrl.searchParams.get('event_id');
  const db = adminDb();
  try {
    const upcomingSnap = await db
      .collection('events')
      .where('event_datetime', '>=', Timestamp.now())
      .orderBy('event_datetime', 'asc')
      .limit(UPCOMING_LIMIT)
      .get();
    const upcoming = upcomingSnap.docs.map(d => summarize(adminRowOf<EventRow>(d)));

    let selected: MeetingSummaryRecord | null = upcoming[0] ?? null;
    if (requestedId) {
      const match = upcoming.find(e => e.id === requestedId);
      if (match) {
        selected = match;
      } else {
        const eventSnap = await db.collection('events').doc(requestedId).get();
        if (!eventSnap.exists) {
          return NextResponse.json({ error: 'event not found' }, { status: 404, headers: NO_STORE });
        }
        selected = summarize(adminRowOf<EventRow>(eventSnap));
      }
    }

    const attendees = selected ? await loadAttendees(db, selected.id) : [];
    return NextResponse.json(
      {
        event: selected,
        is_next_meeting: selected !== null && selected.id === upcoming[0]?.id,
        upcoming_events: upcoming,
        count: attendees.length,
        attendees,
        generated_at: new Date().toISOString(),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'lookup failed' },
      { status: 500, headers: NO_STORE },
    );
  }
}
