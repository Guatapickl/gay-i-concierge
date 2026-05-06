import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  enqueueRsvpConfirmation,
  scheduleEventReminders,
} from '@/lib/reminders';

export const runtime = 'nodejs';

/* ─── helpers ─────────────────────────────────────────────────────── */

function envOrFail() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

/** Build a per-request Supabase client scoped to the caller's JWT. */
function userClient(url: string, anon: string, authHeader: string) {
  return createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticatedUserId(
  url: string,
  anon: string,
  authHeader: string | null,
) {
  if (!authHeader) return null;
  const client = userClient(url, anon, authHeader);
  const { data } = await client.auth.getUser();
  return { userId: data?.user?.id ?? null, client };
}

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
  const env = envOrFail();
  if (!env) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id query param required' }, { status: 400 });
  }

  const checkOnly = req.nextUrl.searchParams.get('check') === 'true';
  const authHeader = req.headers.get('authorization');

  if (checkOnly) {
    // ── Check if the current user has RSVPed ──
    const auth = await authenticatedUserId(env.url, env.anon, authHeader);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const { data, error } = await auth.client
      .from('rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('profile_id', auth.userId)
      .limit(1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ rsvped: (data ?? []).length > 0 });
  }

  // ── Attendee list (public, no auth required) ──
  // Uses an anon-key client so RLS controls visibility.
  const anonClient = createClient(env.url, env.anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rsvps, error: rsvpErr } = await anonClient
    .from('rsvps')
    .select('id, profile_id, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (rsvpErr) {
    return NextResponse.json({ error: rsvpErr.message }, { status: 500 });
  }

  // Hydrate with profile names for the attendee list
  const profileIds = (rsvps ?? []).map((r) => r.profile_id as string);
  let profileMap: Record<string, string | null> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await anonClient
      .from('profiles')
      .select('id, name')
      .in('id', profileIds);
    for (const p of profiles ?? []) {
      profileMap[p.id as string] = (p.name as string) || null;
    }
  }

  const attendees = (rsvps ?? []).map((r) => ({
    id: r.id,
    profile_id: r.profile_id,
    name: profileMap[r.profile_id as string] ?? null,
    rsvped_at: r.created_at,
  }));

  return NextResponse.json({ event_id: eventId, count: attendees.length, attendees });
}

/* ─── POST  /api/events/rsvp  { event_id } ───────────────────────── */

/**
 * Create an RSVP for the authenticated user. Enqueues a confirmation email
 * and schedules event reminders as side-effects (best-effort).
 */
export async function POST(req: NextRequest) {
  const env = envOrFail();
  if (!env) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.event_id) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  const auth = await authenticatedUserId(env.url, env.anon, authHeader);
  if (!auth?.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Verify event exists
  const { data: event, error: eventErr } = await auth.client
    .from('events')
    .select('id, event_datetime')
    .eq('id', body.event_id)
    .single();

  if (eventErr || !event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 });
  }

  // Insert RSVP row — tolerate duplicate (idempotent)
  const { error: insertError } = await auth.client
    .from('rsvps')
    .insert([
      {
        profile_id: auth.userId,
        event_id: body.event_id,
        event_date: event.event_datetime,
      },
    ]);
  if (insertError && !insertError.message.includes('duplicate')) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Side-effects — best-effort, never fail the RSVP for email issues
  await Promise.allSettled([
    enqueueRsvpConfirmation({ eventId: body.event_id, userId: auth.userId }),
    scheduleEventReminders(body.event_id),
  ]);

  return NextResponse.json({ ok: true, event_id: body.event_id, profile_id: auth.userId });
}

/* ─── DELETE  /api/events/rsvp?event_id=...  ─────────────────────── */

/**
 * Cancel an RSVP for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  const env = envOrFail();
  if (!env) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id query param required' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  const auth = await authenticatedUserId(env.url, env.anon, authHeader);
  if (!auth?.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { error } = await auth.client
    .from('rsvps')
    .delete()
    .eq('profile_id', auth.userId)
    .eq('event_id', eventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event_id: eventId });
}
