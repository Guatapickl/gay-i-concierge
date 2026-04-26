import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enqueueRsvpConfirmation, scheduleEventReminders } from '@/lib/reminders';

export const runtime = 'nodejs';

/**
 * Authenticated RSVP endpoint that wraps the database insert with email
 * side-effects (confirmation + reminder scheduling). Clients can keep using
 * the direct supabase RSVP path; calling this route just adds the emails.
 */
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
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
  if (!authHeader) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { error: insertError } = await userClient
    .from('rsvps')
    .insert([{ profile_id: userId, event_id: body.event_id }]);
  if (insertError && !insertError.message.includes('duplicate')) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Side effects — best-effort, never fail the RSVP for email issues
  await Promise.allSettled([
    enqueueRsvpConfirmation({ eventId: body.event_id, userId }),
    scheduleEventReminders(body.event_id),
  ]);

  return NextResponse.json({ ok: true });
}
