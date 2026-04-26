/**
 * Server-only helpers for managing the email_reminders queue.
 * Never import from client components — uses the service-role Supabase client,
 * which throws if instantiated without server env vars.
 */

import { getSupabaseAdmin } from './supabaseAdmin';
import { eventReminderEmail, rsvpConfirmationEmail } from './emailTemplates';
import { sendEmail } from './email';
import type { Event, EmailReminder } from '@/types/supabase';

const REMINDER_OFFSETS_HOURS = [24, 1] as const;

/**
 * Schedule the standard reminder set (24h and 1h before) for every RSVPed
 * subscriber to a given event. Idempotent: skips already-queued reminders.
 */
export async function scheduleEventReminders(eventId: string): Promise<{
  scheduled: number;
  skipped: number;
}> {
  const admin = getSupabaseAdmin();
  const { data: event } = await admin.from('events').select('*').eq('id', eventId).single();
  if (!event) return { scheduled: 0, skipped: 0 };
  const ev = event as Event;

  // Pull RSVPed users and their email opt-ins
  const { data: rsvps } = await admin
    .from('rsvps')
    .select('profile_id')
    .eq('event_id', eventId);
  const userIds = (rsvps || []).map(r => r.profile_id as string);
  if (userIds.length === 0) return { scheduled: 0, skipped: 0 };

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, email')
    .in('id', userIds);
  const userEmails = new Map<string, string>();
  for (const p of profiles || []) {
    if (p.email) userEmails.set(p.id as string, p.email as string);
  }

  // Filter to opted-in
  const emailList = Array.from(userEmails.values());
  if (emailList.length === 0) return { scheduled: 0, skipped: 0 };
  const { data: subs } = await admin
    .from('alerts_subscribers')
    .select('email, email_opt_in')
    .in('email', emailList);
  const optedIn = new Set(
    (subs || []).filter(s => s.email_opt_in).map(s => s.email as string)
  );

  const eventTime = new Date(ev.event_datetime).getTime();
  let scheduled = 0;
  let skipped = 0;

  for (const [uid, email] of userEmails) {
    if (!optedIn.has(email)) {
      skipped += 1;
      continue;
    }
    for (const hours of REMINDER_OFFSETS_HOURS) {
      const sendAt = new Date(eventTime - hours * 3600 * 1000);
      if (sendAt.getTime() < Date.now() - 60_000) continue; // don't backfill past reminders

      // Idempotency: skip if a pending reminder already exists for this combo
      const { data: existing } = await admin
        .from('email_reminders')
        .select('id')
        .eq('event_id', ev.id)
        .eq('recipient_email', email)
        .eq('kind', 'event_reminder')
        .eq('send_at', sendAt.toISOString())
        .limit(1);
      if (existing && existing.length > 0) {
        skipped += 1;
        continue;
      }

      const { subject, html, text } = eventReminderEmail(ev, hours);
      const { error } = await admin.from('email_reminders').insert({
        event_id: ev.id,
        recipient_email: email,
        recipient_user_id: uid,
        kind: 'event_reminder',
        subject,
        body_html: html,
        body_text: text,
        send_at: sendAt.toISOString(),
      });
      if (error) {
        console.error('Failed to enqueue reminder:', error.message);
        skipped += 1;
      } else {
        scheduled += 1;
      }
    }
  }

  return { scheduled, skipped };
}

/**
 * Send an immediate RSVP confirmation. Inserts a row with send_at=now() and
 * lets the cron processor pick it up — keeps a single send path for retries.
 */
export async function enqueueRsvpConfirmation(args: {
  eventId: string;
  userId: string;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const [{ data: event }, { data: profile }] = await Promise.all([
    admin.from('events').select('*').eq('id', args.eventId).single(),
    admin.from('user_profiles').select('email').eq('id', args.userId).single(),
  ]);
  if (!event || !profile?.email) return false;

  // Only send if user has opted into email
  const { data: sub } = await admin
    .from('alerts_subscribers')
    .select('email_opt_in')
    .eq('email', profile.email)
    .maybeSingle();
  if (!sub?.email_opt_in) return false;

  const { subject, html, text } = rsvpConfirmationEmail(event as Event);
  const { error } = await admin.from('email_reminders').insert({
    event_id: args.eventId,
    recipient_email: profile.email,
    recipient_user_id: args.userId,
    kind: 'rsvp_confirmation',
    subject,
    body_html: html,
    body_text: text,
    send_at: new Date().toISOString(),
  });
  if (error) {
    console.error('Failed to enqueue RSVP confirmation:', error.message);
    return false;
  }
  return true;
}

/**
 * Process the reminder queue: pick up to `limit` due rows, send them,
 * mark sent or failed. Designed to be called by a cron job.
 */
export async function processDueReminders(limit = 50): Promise<{
  attempted: number;
  sent: number;
  failed: number;
}> {
  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Claim a batch by transitioning to 'sending'. Two-step (select then update)
  // is fine for low-volume cron; if scaled up, replace with a SELECT … FOR UPDATE SKIP LOCKED RPC.
  const { data: due, error } = await admin
    .from('email_reminders')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', nowIso)
    .order('send_at', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('Failed to read reminder queue:', error.message);
    return { attempted: 0, sent: 0, failed: 0 };
  }
  if (!due || due.length === 0) return { attempted: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const row of due as EmailReminder[]) {
    await admin
      .from('email_reminders')
      .update({ status: 'sending', attempts: row.attempts + 1 })
      .eq('id', row.id);

    const result = await sendEmail({
      to: row.recipient_email,
      subject: row.subject,
      html: row.body_html,
      text: row.body_text || undefined,
    });

    if (result.ok) {
      await admin
        .from('email_reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
        .eq('id', row.id);
      sent += 1;
    } else {
      await admin
        .from('email_reminders')
        .update({
          status: row.attempts + 1 >= 3 ? 'failed' : 'pending',
          error: result.error,
        })
        .eq('id', row.id);
      failed += 1;
    }
  }
  return { attempted: due.length, sent, failed };
}
