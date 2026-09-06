import { createHash, timingSafeEqual } from 'node:crypto';
import { adminAuth, adminDb } from './firebase/admin';
import { adminPayloadOf, adminRowOf } from './firebase/adminDb';
import { pollInviteEmail } from './emailTemplates';
import { localDate, followingMonth, weekendDates, dateLabel, dateQuestionId, selectedDates, pollDateTimestamp } from './meeting-workflow-dates';
import { isPollOpen, newYorkMeetingTime } from './poll-scheduling';
import type { MeetingPoll, MeetingPollOption } from '@/types/supabase';

type Workflow = { targetMonth: string; dates: string[]; state: string; ownerUid: string; expiresAt: string; queryId?: string; questionnaireUrl?: string; pollId?: string; notificationsQueued?: boolean };
const workflows = () => adminDb().collection('meeting_automation_requests');
export function automationAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = Buffer.from(req.headers.get('authorization') || '');
  const wanted = Buffer.from(`Bearer ${expected}`);
  return got.length === wanted.length && timingSafeEqual(got, wanted);
}
export async function runMeetingAutomation(now = new Date()) {
  const db = adminDb();
  const config = (await db.collection('meeting_automation_config').doc('default').get()).data();
  if (!config?.enabled || !config.ownerUid || !config.activatedAt) return { created: 0, enabled: false };
  const events = await db.collection('events').get();
  let created = 0;
  for (const event of events.docs) {
    const data = adminRowOf<{ event_datetime: string; end_datetime?: string }>(event);
    const start = new Date(data.event_datetime);
    const end = new Date(data.end_datetime || start.getTime() + 2 * 60 * 60 * 1000);
    if (!Number.isFinite(start.getTime()) || start < new Date(config.activatedAt) || localDate(end) >= localDate(now)) continue;
    const targetMonth = followingMonth(localDate(start));
    // A month-end meeting is processed on the first day of its target month.
    if (targetMonth < localDate(now).slice(0, 7)) continue;
    const dates = weekendDates(targetMonth).filter(date => date > localDate(now));
    if (!dates.length) continue;
    const ref = workflows().doc(`month-${targetMonth}`);
    created += await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return 0;
      tx.create(ref, { targetMonth, dates, state: 'pending', ownerUid: config.ownerUid, sourceEventId: event.id, createdAt: now.toISOString(), expiresAt: new Date(Math.min(now.getTime() + 14 * 86400000, Date.parse(newYorkMeetingTime(dates[0], '00:00')))).toISOString() });
      return 1;
    });
  }
  const pending = await workflows().where('state', '==', 'published').get();
  for (const snap of pending.docs) if (!snap.data().notificationsQueued) await queuePollInvitations(snap.id, now);
  return { created, enabled: true };
}
export async function ownerQuestions() {
  const snap = await workflows().get();
  return snap.docs.filter(d => ['pending', 'awaiting_owner'].includes(d.data().state) && new Date(d.data().expiresAt) > new Date()).slice(0, 20).map(d => {
    const w = d.data() as Workflow;
    return { id: d.id, subject: `GayIClub: your ${w.targetMonth} weekend availability`, body: 'Which days work for you? Members will only be polled on days you mark Available. Your available dates will be offered to members for one week. A clear winner is booked using your meeting defaults; ties come back to you. If none work, no member poll will be sent.', recipientName: 'Robert', questions: w.dates.map(date => ({ id: dateQuestionId(date), kind: 'choice', prompt: dateLabel(date), options: ['Available', 'Unavailable'], required: true })), expiresAt: w.expiresAt };
  });
}
export async function recordOwnerEvent(id: string, body: Record<string, unknown>, now = new Date()) {
  if (!/^month-\d{4}-\d{2}$/.test(id) || typeof body.eventId !== 'string' || !body.eventId.trim() || body.eventId.length > 200 || typeof body.queryId !== 'string' || !body.queryId || body.queryId.length > 200 || (body.type !== 'question_sent' && body.type !== 'answered')) throw new Error('Invalid event');
  // Same contract as Praxis automation-questions.ts: project ID + request ID.
  const expectedQueryId = `hq_auto_${createHash('sha256').update(`gayiclub:${id}`).digest('hex').slice(0, 32)}`;
  if (body.queryId !== expectedQueryId) throw new Error('Questionnaire does not match this request');
  const db = adminDb();
  const ref = workflows().doc(id);
  const ledger = ref.collection('events').doc(createHash('sha256').update(body.eventId).digest('hex'));
  await db.runTransaction(async tx => {
    const [snap, previous] = await Promise.all([tx.get(ref), tx.get(ledger)]);
    if (!snap.exists) throw new Error('Unknown owner request');
    const w = snap.data() as Workflow;
    if (w.queryId && w.queryId !== body.queryId) throw new Error('Questionnaire does not match');
    if (previous.exists) {
      if (previous.data()?.type !== body.type) throw new Error('Event ID already used for another event type');
      return;
    }
    if (body.type === 'question_sent') {
      tx.update(ref, { queryId: body.queryId, questionnaireUrl: typeof body.questionnaireUrl === 'string' ? body.questionnaireUrl : null, ...(w.state === 'pending' ? { state: 'awaiting_owner' } : {}) });
    } else {
      if (!['pending', 'awaiting_owner'].includes(w.state)) throw new Error('Availability already recorded');
      if (new Date(w.expiresAt) <= now) throw new Error('Availability request expired');
      const chosen = selectedDates(w.dates, body.answers);
      if (chosen.some(date => date <= localDate(now))) throw new Error('Selected dates must still be in the future');
      const pollId = `automation-${id}`;
      const pollRef = db.collection('meeting_polls').doc(pollId);
      const existingPoll = await tx.get(pollRef);
      if (existingPoll.exists) throw new Error('Poll already exists');
      if (chosen.length) {
        tx.create(pollRef, adminPayloadOf({ title: `${new Date(`${w.targetMonth}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })} meeting date`, description: 'Rank the days that work for you and mark any dates you cannot make. Robert has confirmed availability on each option. Voting stays open for one week; a clear winner is booked automatically and Robert decides ties.', status: 'open', event_id: null, date_only: true, target_month: w.targetMonth, source_workflow: id, auto_schedule: true, opened_at: now.toISOString(), closes_at: new Date(now.getTime() + 7 * 86400000).toISOString(), created_by: w.ownerUid, created_at: now.toISOString(), updated_at: now.toISOString() }));
        chosen.forEach((date, index) => tx.create(db.collection('meeting_poll_options').doc(`${pollId}-${date}`), adminPayloadOf({ poll_id: pollId, option_datetime: pollDateTimestamp(date), label: dateLabel(date), date_only: true, sort_order: index })));
      }
      tx.update(ref, { state: chosen.length ? 'published' : 'needs_availability', selectedDates: chosen, answers: body.answers, queryId: body.queryId, answeredAt: now.toISOString(), pollId: chosen.length ? pollId : null });
    }
    tx.create(ledger, { type: body.type, receivedAt: now.toISOString() });
  });
  await queuePollInvitations(id, now);
  return { ok: true };
}
async function queuePollInvitations(id: string, now = new Date()) {
  const db = adminDb();
  const ref = workflows().doc(id);
  const w = (await ref.get()).data() as Workflow;
  if (w.state !== 'published' || !w.pollId || w.notificationsQueued) return;
  const [owner, pollSnap, optionsSnap, subscribers] = await Promise.all([adminAuth().getUser(w.ownerUid), db.collection('meeting_polls').doc(w.pollId).get(), db.collection('meeting_poll_options').where('poll_id', '==', w.pollId).get(), db.collection('alerts_subscribers').where('email_opt_in', '==', true).get()]);
  const poll = adminRowOf<MeetingPoll>(pollSnap);
  if (!pollSnap.exists || !isPollOpen(poll, now.getTime())) {
    await ref.update({ notificationsQueued: true, notificationsSkipped: 'poll_closed_or_expired', notificationsFinishedAt: now.toISOString() });
    return;
  }
  const options = optionsSnap.docs.map(d => adminRowOf<MeetingPollOption>(d)).sort((a,b) => a.sort_order-b.sort_order);
  const { subject, html, text } = pollInviteEmail(poll, options);
  for (const subscriber of subscribers.docs) {
    const s = subscriber.data();
    const email = typeof s.email === 'string' ? s.email.trim().toLowerCase() : '';
    if (!email || s.user_id === w.ownerUid || email === owner.email?.trim().toLowerCase()) continue;
    const queueRef = db.collection('email_reminders').doc(createHash('sha256').update(`${w.pollId}:poll_invite:${email}`).digest('hex'));
    await db.runTransaction(async tx => {
      if ((await tx.get(queueRef)).exists) return;
      tx.create(queueRef, adminPayloadOf({ event_id: null, recipient_email: email, recipient_user_id: s.user_id || null, kind: 'poll_invite', subject, body_html: html, body_text: text, send_at: new Date().toISOString(), sent_at: null, status: 'pending', error: null, attempts: 0, created_at: new Date().toISOString() }));
    });
  }
  await ref.update({ notificationsQueued: true });
}
