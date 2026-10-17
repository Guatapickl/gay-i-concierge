/**
 * Organizer-sent meeting reminders: one email to every member who has signed
 * up at gayiclub.com (every Firebase Auth account with an email address),
 * about one upcoming meeting.
 *
 * Server-only. Uses the Firebase Admin SDK; never import from client code.
 *
 * Delivery goes through the existing `email_reminders` queue, so the Resend
 * transport, retries and audit trail are shared with the automatic reminders.
 * Members who explicitly unsubscribed from club email (an
 * `alerts_subscribers` row with `email_opt_in: false`) are left out; members
 * who never visited /alerts have no row and are included, because signing up
 * for the club is the relationship this email rests on.
 */

import { randomUUID } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { adminAuth, adminDb } from './firebase/admin';
import { adminPayloadOf, adminRowOf } from './firebase/adminDb';
import { meetingReminderEmail } from './emailTemplates';
import type { Event } from '@/types/supabase';

export const MEETING_REMINDER_KIND = 'meeting_reminder';

export type MeetingReminderRecipient = {
  email: string;
  user_id: string;
  has_rsvped: boolean;
};

export type MeetingReminderSummary = {
  id: string;
  title: string;
  event_datetime: string;
  location: string | null;
};

export type MeetingReminderPlan = {
  event: MeetingReminderSummary;
  /** Members who will receive (or, in a dry run, would receive) this reminder. */
  recipients: MeetingReminderRecipient[];
  /** Accounts left out because they unsubscribed from club email. */
  unsubscribed: number;
  /** Accounts left out because they already received a reminder for this meeting. */
  already_reminded: number;
  /** Accounts with no usable email address or disabled sign-in. */
  unreachable: number;
  /** Total accounts considered. */
  accounts: number;
};

export type MeetingReminderResult = MeetingReminderPlan & {
  dry_run: boolean;
  batch_id: string | null;
  queued: number;
  subject: string;
};

export class MeetingReminderError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'MeetingReminderError';
  }
}

/** Firestore `in` accepts at most 30 values. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.includes('@') ? email : null;
};

function summarize(event: Event): MeetingReminderSummary {
  return {
    id: event.id,
    title: event.title,
    event_datetime: event.event_datetime,
    location: event.location ?? null,
  };
}

/** The meeting to remind about: `eventId` when given, otherwise the next upcoming one. */
export async function resolveMeetingForReminder(db: Firestore, eventId?: string | null): Promise<Event> {
  if (eventId) {
    const snap = await db.collection('events').doc(eventId).get();
    if (!snap.exists) throw new MeetingReminderError('event not found', 404);
    return adminRowOf<Event>(snap);
  }
  const snap = await db
    .collection('events')
    .where('event_datetime', '>=', Timestamp.now())
    .orderBy('event_datetime', 'asc')
    .limit(1)
    .get();
  if (snap.empty) throw new MeetingReminderError('no upcoming meeting to remind about', 404);
  return adminRowOf<Event>(snap.docs[0]);
}

/** Every enabled account with an email address, keyed by lower-cased email. */
export async function listAccountEmails(auth: Auth): Promise<{ byEmail: Map<string, string>; accounts: number; unreachable: number }> {
  const byEmail = new Map<string, string>();
  let accounts = 0;
  let unreachable = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      accounts += 1;
      const email = normalizeEmail(user.email);
      if (!email || user.disabled) {
        unreachable += 1;
        continue;
      }
      if (!byEmail.has(email)) byEmail.set(email, user.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return { byEmail, accounts, unreachable };
}

/** Emails with an explicit club-email unsubscribe on file. */
export async function listUnsubscribedEmails(db: Firestore, emails: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (const part of chunk(emails)) {
    const snap = await db.collection('alerts_subscribers').where('email', 'in', part).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const email = normalizeEmail(data.email);
      if (email && data.email_opt_in === false) out.add(email);
    }
  }
  return out;
}

/** Emails already queued or sent a meeting reminder for this event. */
async function listAlreadyReminded(db: Firestore, eventId: string): Promise<Set<string>> {
  const snap = await db
    .collection('email_reminders')
    .where('kind', '==', MEETING_REMINDER_KIND)
    .where('event_id', '==', eventId)
    .get();
  const out = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status === 'cancelled') continue;
    const email = normalizeEmail(data.recipient_email);
    if (email) out.add(email);
  }
  return out;
}

async function listRsvpedUids(db: Firestore, eventId: string): Promise<Set<string>> {
  const snap = await db.collection('rsvps').where('event_id', '==', eventId).get();
  return new Set(snap.docs.map(d => d.data().profile_id).filter((v): v is string => typeof v === 'string'));
}

export type PlanMeetingReminderArgs = {
  eventId?: string | null;
  /** Queue another reminder for members who already received one for this meeting. */
  resend?: boolean;
  db?: Firestore;
  auth?: Auth;
};

/** Work out who gets the reminder without writing anything. */
export async function planMeetingReminder(args: PlanMeetingReminderArgs = {}): Promise<{ plan: MeetingReminderPlan; event: Event }> {
  const db = args.db ?? adminDb();
  const auth = args.auth ?? adminAuth();
  const event = await resolveMeetingForReminder(db, args.eventId);

  const { byEmail, accounts, unreachable } = await listAccountEmails(auth);
  const emails = Array.from(byEmail.keys());
  const [unsubscribed, reminded, rsvped] = await Promise.all([
    listUnsubscribedEmails(db, emails),
    args.resend ? Promise.resolve(new Set<string>()) : listAlreadyReminded(db, event.id),
    listRsvpedUids(db, event.id),
  ]);

  const recipients: MeetingReminderRecipient[] = [];
  let alreadyReminded = 0;
  for (const [email, uid] of byEmail) {
    if (unsubscribed.has(email)) continue;
    if (reminded.has(email)) {
      alreadyReminded += 1;
      continue;
    }
    recipients.push({ email, user_id: uid, has_rsvped: rsvped.has(uid) });
  }
  recipients.sort((a, b) => a.email.localeCompare(b.email));

  return {
    event,
    plan: {
      event: summarize(event),
      recipients,
      unsubscribed: emails.filter(e => unsubscribed.has(e)).length,
      already_reminded: alreadyReminded,
      unreachable,
      accounts,
    },
  };
}

export type SendMeetingReminderArgs = PlanMeetingReminderArgs & {
  /** Organizer's note included in the email body. */
  note?: string | null;
  /** Plan only; queue nothing. */
  dryRun?: boolean;
  /** Who triggered the send, recorded on each queued row. */
  requestedBy?: string | null;
};

/**
 * Queue the reminder for every planned recipient. Rows land in
 * `email_reminders` with `send_at: now`, where the reminder cron (or an
 * immediate `processDueReminders` call) delivers them.
 */
export async function sendMeetingReminder(args: SendMeetingReminderArgs = {}): Promise<MeetingReminderResult> {
  const db = args.db ?? adminDb();
  const { plan, event } = await planMeetingReminder({ ...args, db });
  const note = (args.note ?? '').trim() || null;
  const { subject } = meetingReminderEmail(event, { note });

  if (args.dryRun || plan.recipients.length === 0) {
    return { ...plan, dry_run: !!args.dryRun, batch_id: null, queued: 0, subject };
  }

  const batchId = randomUUID();
  const now = new Date().toISOString();
  const col = db.collection('email_reminders');
  for (const part of chunk(plan.recipients, 400)) {
    const batch = db.batch();
    for (const recipient of part) {
      const { html, text } = meetingReminderEmail(event, { note, hasRsvped: recipient.has_rsvped });
      batch.set(
        col.doc(),
        adminPayloadOf({
          event_id: event.id,
          recipient_email: recipient.email,
          recipient_user_id: recipient.user_id,
          kind: MEETING_REMINDER_KIND,
          subject,
          body_html: html,
          body_text: text,
          send_at: now,
          sent_at: null,
          status: 'pending',
          error: null,
          attempts: 0,
          created_at: now,
          batch_id: batchId,
          requested_by: args.requestedBy ?? null,
          note,
        }),
      );
    }
    await batch.commit();
  }

  return { ...plan, dry_run: false, batch_id: batchId, queued: plan.recipients.length, subject };
}
