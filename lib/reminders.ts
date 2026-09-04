/**
 * Server-only helpers for managing the email_reminders queue.
 * Never import from client components — uses the Firebase Admin SDK, which
 * only initialises with server credentials.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import { adminPayloadOf, adminRowOf } from './firebase/adminDb';
import { eventReminderEmail, rsvpConfirmationEmail } from './emailTemplates';
import { sendEmail } from './email';
import type { Event, EmailReminder } from '@/types/supabase';

const REMINDER_OFFSETS_HOURS = [24, 1] as const;

/** Firestore `in` accepts ≤30 values. Local copy so this module never imports the client SDK. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getEvent(eventId: string): Promise<Event | null> {
  const snap = await adminDb().collection('events').doc(eventId).get();
  return snap.exists ? adminRowOf<Event>(snap) : null;
}

/**
 * Schedule the standard reminder set (24h and 1h before) for every RSVPed
 * subscriber to a given event. Idempotent: skips already-queued reminders.
 */
export async function scheduleEventReminders(eventId: string): Promise<{
  scheduled: number;
  skipped: number;
}> {
  const db = adminDb();
  const ev = await getEvent(eventId);
  if (!ev) return { scheduled: 0, skipped: 0 };

  // Pull RSVPed users and their email opt-ins
  const rsvps = await db.collection('rsvps').where('event_id', '==', eventId).get();
  const userIds = Array.from(new Set(rsvps.docs.map(d => d.data().profile_id as string).filter(Boolean)));
  if (userIds.length === 0) return { scheduled: 0, skipped: 0 };

  const userEmails = new Map<string, string>();
  const profileSnaps = await db.getAll(...userIds.map(id => db.collection('user_profiles').doc(id)));
  for (const p of profileSnaps) {
    const email = p.exists ? (p.data()?.email as string | undefined) : undefined;
    if (email) userEmails.set(p.id, email);
  }

  // Filter to opted-in
  const emailList = Array.from(new Set(userEmails.values()));
  if (emailList.length === 0) return { scheduled: 0, skipped: 0 };
  const optedIn = new Set<string>();
  for (const part of chunk(emailList)) {
    const subs = await db.collection('alerts_subscribers').where('email', 'in', part).get();
    subs.docs.forEach(s => {
      const d = s.data();
      if (d.email_opt_in) optedIn.add(d.email as string);
    });
  }

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

      // Idempotency: skip if a reminder already exists for this combo
      const existing = await db
        .collection('email_reminders')
        .where('event_id', '==', ev.id)
        .where('recipient_email', '==', email)
        .where('kind', '==', 'event_reminder')
        .where('send_at', '==', Timestamp.fromDate(sendAt))
        .limit(1)
        .get();
      if (!existing.empty) {
        skipped += 1;
        continue;
      }

      const { subject, html, text } = eventReminderEmail(ev, hours);
      try {
        await db.collection('email_reminders').add(adminPayloadOf({
          event_id: ev.id,
          recipient_email: email,
          recipient_user_id: uid,
          kind: 'event_reminder',
          subject,
          body_html: html,
          body_text: text,
          send_at: sendAt.toISOString(),
          sent_at: null,
          status: 'pending',
          error: null,
          attempts: 0,
          created_at: new Date().toISOString(),
        }));
        scheduled += 1;
      } catch (err) {
        console.error('Failed to enqueue reminder:', (err as Error).message);
        skipped += 1;
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
  const db = adminDb();
  const [event, profileSnap] = await Promise.all([
    getEvent(args.eventId),
    db.collection('user_profiles').doc(args.userId).get(),
  ]);
  const email = profileSnap.exists ? (profileSnap.data()?.email as string | undefined) : undefined;
  if (!event || !email) return false;

  // Only send if user has opted into email
  const subs = await db.collection('alerts_subscribers').where('email', '==', email).limit(1).get();
  if (subs.empty || !subs.docs[0].data().email_opt_in) return false;

  const { subject, html, text } = rsvpConfirmationEmail(event);
  try {
    await db.collection('email_reminders').add(adminPayloadOf({
      event_id: args.eventId,
      recipient_email: email,
      recipient_user_id: args.userId,
      kind: 'rsvp_confirmation',
      subject,
      body_html: html,
      body_text: text,
      send_at: new Date().toISOString(),
      sent_at: null,
      status: 'pending',
      error: null,
      attempts: 0,
      created_at: new Date().toISOString(),
    }));
    return true;
  } catch (err) {
    console.error('Failed to enqueue RSVP confirmation:', (err as Error).message);
    return false;
  }
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
  const db = adminDb();

  // Claim a batch by transitioning to 'sending'. Two-step (select then update)
  // is fine for low-volume cron; if scaled up, move the claim into a transaction.
  let due: EmailReminder[];
  try {
    const snap = await db
      .collection('email_reminders')
      .where('status', '==', 'pending')
      .where('send_at', '<=', Timestamp.now())
      .orderBy('send_at', 'asc')
      .limit(limit)
      .get();
    due = snap.docs.map(d => adminRowOf<EmailReminder>(d));
  } catch (err) {
    console.error('Failed to read reminder queue:', (err as Error).message);
    return { attempted: 0, sent: 0, failed: 0 };
  }
  if (due.length === 0) return { attempted: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const row of due) {
    const docRef = db.collection('email_reminders').doc(row.id);
    const attempts = (row.attempts ?? 0) + 1;
    await docRef.update({ status: 'sending', attempts });

    const result = await sendEmail({
      to: row.recipient_email,
      subject: row.subject,
      html: row.body_html,
      text: row.body_text || undefined,
    });

    if (result.ok) {
      await docRef.update({ status: 'sent', sent_at: Timestamp.now(), error: null });
      sent += 1;
    } else {
      await docRef.update({
        status: attempts >= 3 ? 'failed' : 'pending',
        error: result.error,
      });
      failed += 1;
    }
  }
  return { attempted: due.length, sent, failed };
}
