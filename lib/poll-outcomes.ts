import { createHash } from 'node:crypto';
import type { DocumentSnapshot, Firestore, Transaction } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebase/admin';
import { adminPayloadOf, adminRowOf } from './firebase/adminDb';
import { PollActionError } from './poll-ballots';
import { mergePollVotes, tallyPoll } from './poll-tally';
import { buildPollReport, buildTieQuestion, type PollReportInput, type PollReportRow } from './poll-report';
import { formatPollDeadline, newYorkDate, newYorkMeetingTime } from './poll-scheduling';
import type { Event, MeetingPoll, MeetingPollBallot, MeetingPollOption, MeetingPollVote } from '@/types/supabase';

type Config = { enabled?: boolean; ownerUid?: string; defaultMeetingTime?: string; defaultMeetingLocation?: string };
type Decision = {
  pollId: string; title: string; ownerUid: string; state: 'pending' | 'awaiting_owner' | 'resolved';
  choices: { optionId: string; label: string }[]; reportText: string; expiresAt: string;
  queryId?: string; eventId?: string;
};
export type PollBookingInput = { optionId: string; meetingTime?: string; title?: string; location?: string; description?: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const pollEventId = (pollId: string) => `poll-${hash(pollId).slice(0, 40)}`;
const decisions = (db: Firestore) => db.collection('poll_owner_decisions');
const tieId = (pollId: string) => `tie-${pollId}`;
const nowIso = (now: Date) => now.toISOString();
const nonempty = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim() : undefined;

async function readPoll(db: Firestore, tx: Transaction, pollId: string) {
  const pollRef = db.collection('meeting_polls').doc(pollId);
  const [snap, configSnap, optionsSnap, ballotsSnap, votesSnap, decisionSnap] = await Promise.all([
    tx.get(pollRef), tx.get(db.collection('meeting_automation_config').doc('default')),
    tx.get(db.collection('meeting_poll_options').where('poll_id', '==', pollId)),
    tx.get(db.collection('meeting_poll_ballots').where('poll_id', '==', pollId)),
    tx.get(db.collection('meeting_poll_votes').where('poll_id', '==', pollId)),
    tx.get(decisions(db).doc(tieId(pollId))),
  ]);
  if (!snap.exists) throw new PollActionError('Poll not found.', 404);
  const poll = adminRowOf<MeetingPoll & { ballot_revision?: number }>(snap);
  const config = (configSnap.data() || {}) as Config;
  const options = optionsSnap.docs.map(d => adminRowOf<MeetingPollOption>(d));
  const tally = tallyPoll(options, mergePollVotes(votesSnap.docs.map(d => adminRowOf<MeetingPollVote>(d)), ballotsSnap.docs.map(d => adminRowOf<MeetingPollBallot>(d))));
  const eventRef = db.collection('events').doc(poll.event_id || pollEventId(pollId));
  const eventSnap = await tx.get(eventRef);
  return { pollRef, poll, config, options, tally, eventRef, eventSnap, decisionSnap };
}
type Context = Awaited<ReturnType<typeof readPoll>>;

function settings(ctx: Context, input: Partial<PollBookingInput> = {}) {
  return {
    time: nonempty(input.meetingTime) ?? nonempty(ctx.poll.default_meeting_time) ?? nonempty(ctx.config.defaultMeetingTime),
    location: nonempty(input.location) ?? nonempty(ctx.poll.default_meeting_location) ?? nonempty(ctx.config.defaultMeetingLocation),
  };
}
function optionInstant(ctx: Context, option: MeetingPollOption, time?: string): string | undefined {
  if (ctx.poll.date_only || option.date_only) {
    if (!time) return undefined;
    return newYorkMeetingTime(newYorkDate(option.option_datetime), time);
  }
  if (!Number.isFinite(Date.parse(option.option_datetime))) throw new PollActionError('Invalid candidate date.');
  return new Date(option.option_datetime).toISOString();
}
function eligible(ctx: Context, option: MeetingPollOption, now: Date): boolean {
  try {
    const instant = optionInstant(ctx, option, settings(ctx).time);
    return instant ? Date.parse(instant) > now.getTime() : newYorkDate(option.option_datetime) >= newYorkDate(nowIso(now));
  } catch {
    // Invalid defaults must lead to an owner scheduling decision, not a false past-date result.
    try { return newYorkDate(option.option_datetime) >= newYorkDate(nowIso(now)); } catch { return false; }
  }
}
function createBooking(db: Firestore, tx: Transaction, ctx: Context, input: PollBookingInput, actorUid: string, now: Date) {
  if (ctx.poll.event_id) {
    if (!ctx.eventSnap.exists) throw new PollActionError('The booked meeting could not be found.', 409);
    return { event: adminRowOf<Event>(ctx.eventSnap), alreadyBooked: true };
  }
  if (ctx.poll.auto_schedule && (!ctx.config.ownerUid || actorUid !== ctx.config.ownerUid)) throw new PollActionError('Only Robert can book an automatic poll.', 403);
  const option = ctx.options.find(o => o.id === input.optionId);
  if (!option) throw new PollActionError('Choose a date from this poll.');
  const decision = ctx.decisionSnap.exists ? ctx.decisionSnap.data() as Decision : undefined;
  const isTie = ctx.poll.result_status === 'awaiting_tie_break' || !!(decision && ['pending', 'awaiting_owner'].includes(decision.state));
  if (isTie) {
    if (!ctx.config.ownerUid || actorUid !== ctx.config.ownerUid || (decision && decision.ownerUid !== actorUid)) throw new PollActionError('Only Robert can choose the winning tied date.', 403);
    if (decision ? !decision.choices.some(c => c.optionId === input.optionId) : !ctx.poll.tie_option_ids?.includes(input.optionId)) throw new PollActionError('Choose one of the tied dates.');
  }
  const defaults = settings(ctx, input);
  let instant: string | undefined;
  try { instant = optionInstant(ctx, option, defaults.time); } catch (error) { throw new PollActionError(error instanceof Error ? error.message : 'Invalid meeting date.'); }
  if (!instant) throw new PollActionError('Choose the meeting time in New York.');
  if (!defaults.location) throw new PollActionError('Choose the meeting location.');
  if (Date.parse(instant) <= now.getTime()) throw new PollActionError('The selected meeting date and time has passed.', 409);
  // A deterministic orphan must never be silently reassigned to another option.
  if (ctx.eventSnap.exists) throw new PollActionError('An event already exists for this poll; review the existing meeting.', 409);
  const event: Event = { id: ctx.eventRef.id, title: nonempty(input.title) || ctx.poll.title, description: input.description ?? ctx.poll.description ?? null, event_datetime: instant, location: defaults.location, created_at: nowIso(now), updated_at: nowIso(now) };
  tx.create(ctx.eventRef, adminPayloadOf({ ...event, source_poll_id: ctx.poll.id }));
  tx.update(ctx.pollRef, adminPayloadOf({ status: 'closed', result_status: 'scheduled', selected_option_id: option.id, event_id: event.id, updated_at: nowIso(now), ballot_revision: Number(ctx.poll.ballot_revision || 0) + 1 }));
  if (ctx.decisionSnap.exists) tx.update(decisions(db).doc(tieId(ctx.poll.id)), { state: 'resolved', selectedOptionId: option.id, eventId: event.id, resolvedAt: nowIso(now) });
  return { event, alreadyBooked: false };
}

/** Route callers authenticate administrator access; unresolved ties additionally require the configured owner. */
export async function bookPoll(pollId: string, actorUid: string, input: PollBookingInput, now = new Date()) {
  if (!input || typeof input.optionId !== 'string' || !input.optionId) throw new PollActionError('Choose a meeting date.');
  for (const key of ['meetingTime', 'title', 'location', 'description'] as const) if (input[key] !== undefined && typeof input[key] !== 'string') throw new PollActionError(`Invalid ${key}.`);
  const db = adminDb();
  return db.runTransaction(async tx => {
    const ctx = await readPoll(db, tx, pollId);
    const result = createBooking(db, tx, ctx, input, actorUid, now);
    return { ok: true as const, eventId: result.event.id, event_id: result.event.id, alreadyBooked: result.alreadyBooked };
  });
}

function reportRows(ctx: Context): PollReportRow[] {
  // If labels repeat, prefix every label so even a user-provided numbered label cannot collide.
  const labels = ctx.tally.ranked.map(r => nonempty(r.option.label) || formatPollDeadline(r.option.option_datetime));
  const duplicated = new Set(labels).size !== labels.length;
  return ctx.tally.ranked.map((r, index) => ({ optionId: r.option.id, label: duplicated ? `${index + 1}. ${labels[index]}` : labels[index], points: r.points, available: r.available, unavailable: r.unavailable, unanswered: r.unanswered, firstChoice: r.firstChoice, avgRank: r.avgRank }));
}
function classify(ctx: Context, now: Date) {
  const future = ctx.options.filter(o => eligible(ctx, o, now));
  if (!ctx.tally.voters) return { outcome: 'no_responses' as const, winnerIds: [] as string[] };
  if (!future.length && ctx.options.length) return { outcome: 'past_dates' as const, winnerIds: [] as string[] };
  const positive = ctx.tally.ranked.filter(r => r.points > 0 && r.available > 0 && future.some(o => o.id === r.option.id));
  if (!positive.length) return { outcome: 'no_available_dates' as const, winnerIds: [] as string[] };
  const max = Math.max(...positive.map(r => r.points));
  const winnerIds = positive.filter(r => r.points === max).map(r => r.option.id);
  if (winnerIds.length > 1) return { outcome: 'awaiting_tie_break' as const, winnerIds };
  const winner = ctx.options.find(o => o.id === winnerIds[0])!;
  const defaults = settings(ctx);
  try {
    if (!defaults.location || !optionInstant(ctx, winner, defaults.time)) return { outcome: 'needs_schedule' as const, winnerIds };
  } catch { return { outcome: 'needs_schedule' as const, winnerIds }; }
  return { outcome: 'scheduled' as const, winnerIds };
}

async function finalizePoll(pollId: string, ownerUid: string, ownerEmail: string, totalMembers: number, now: Date) {
  const db = adminDb();
  return db.runTransaction(async tx => {
    const ctx = await readPoll(db, tx, pollId);
    if (!ctx.poll.auto_schedule || ctx.poll.report_queued_at || !ctx.poll.closes_at || Date.parse(ctx.poll.closes_at) > now.getTime() || !Number.isFinite(Date.parse(ctx.poll.closes_at))) return null;
    if (ctx.config.enabled === false) return null;
    if (ctx.config.ownerUid !== ownerUid) throw new PollActionError('Poll owner configuration changed; retry finalization.', 409);
    const queueRef = db.collection('email_reminders').doc(`poll-report-${hash(pollId)}`);
    const outcomeRef = db.collection('poll_outcomes').doc(pollId);
    const [queueSnap, outcomeSnap] = await Promise.all([tx.get(queueRef), tx.get(outcomeRef)]);
    const decisionRef = decisions(db).doc(tieId(pollId));
    const selection = ctx.poll.event_id ? { outcome: 'scheduled' as const, winnerIds: [] as string[] } : classify(ctx, now);
    let event: Event | undefined;
    let booked = false;
    if (ctx.poll.event_id) {
      if (!ctx.eventSnap.exists) throw new PollActionError('The booked meeting could not be found.', 409);
      event = adminRowOf<Event>(ctx.eventSnap);
    } else if (selection.outcome === 'scheduled') {
      const booking = createBooking(db, tx, ctx, { optionId: selection.winnerIds[0] }, ownerUid, now);
      event = booking.event;
      booked = !booking.alreadyBooked;
    }
    const rows = reportRows(ctx);
    const reportInput: PollReportInput = { pollId, title: ctx.poll.title, rows, respondents: ctx.tally.voters, totalMembers: Math.max(totalMembers, ctx.tally.voters), outcome: selection.outcome, deadline: formatPollDeadline(ctx.poll.closes_at), tiedOptionIds: selection.winnerIds,
      ...(event ? { eventUrl: `https://gayiclub.com/events/${encodeURIComponent(event.id)}`, eventWhen: formatPollDeadline(event.event_datetime), ...(event.location ? { location: event.location } : {}) } : {}),
    };
    const report = buildPollReport(reportInput);
    if (selection.outcome === 'awaiting_tie_break' && !ctx.decisionSnap.exists) {
      const choices = rows.filter(row => selection.winnerIds.includes(row.optionId)).map(({ optionId, label }) => ({ optionId, label }));
      const earliest = Math.min(...ctx.options.filter(o => selection.winnerIds.includes(o.id)).map(o => {
        try {
          const instant = optionInstant(ctx, o, settings(ctx).time);
          if (instant) return Date.parse(instant);
        } catch { /* Missing or invalid time stays an owner scheduling decision. */ }
        return Date.parse(newYorkMeetingTime(newYorkDate(o.option_datetime), '00:00'));
      }).filter(time => time > now.getTime()));
      const expiresAt = new Date(Math.min(now.getTime() + 7 * 86400000, earliest)).toISOString();
      tx.create(decisionRef, { pollId, title: ctx.poll.title, ownerUid, state: 'pending', choices, reportText: report.text, expiresAt, createdAt: nowIso(now) });
    }
    if (!outcomeSnap.exists) tx.create(outcomeRef, { ...reportInput, createdAt: nowIso(now), ballotRevision: Number(ctx.poll.ballot_revision || 0) });
    if (!queueSnap.exists) tx.create(queueRef, adminPayloadOf({ event_id: event?.id || null, recipient_email: ownerEmail, recipient_user_id: ownerUid, kind: 'poll_owner_report', subject: report.subject, body_html: report.html, body_text: report.text, send_at: nowIso(now), sent_at: null, status: 'pending', error: null, attempts: 0, created_at: nowIso(now) }));
    tx.update(ctx.pollRef, adminPayloadOf({ status: 'closed', result_status: selection.outcome, report_queued_at: nowIso(now), updated_at: nowIso(now), tie_option_ids: selection.outcome === 'awaiting_tie_break' ? selection.winnerIds : [], ballot_revision: Number(ctx.poll.ballot_revision || 0) + 1 }));
    return { booked, reportQueued: !queueSnap.exists, tied: selection.outcome === 'awaiting_tie_break' };
  });
}

export async function runPollOutcomes(now = new Date()) {
  const db = adminDb();
  const polls = await db.collection('meeting_polls').where('auto_schedule', '==', true).get();
  const due = polls.docs.filter(snap => { const p = adminRowOf<MeetingPoll>(snap); return !p.report_queued_at && !!p.closes_at && Date.parse(p.closes_at) <= now.getTime(); });
  const counts = { processed: 0, booked: 0, reportsQueued: 0, ties: 0, errors: [] as { pollId: string; error: string }[] };
  if (!due.length) return counts;
  const config = (await db.collection('meeting_automation_config').doc('default').get()).data() as Config | undefined;
  if (config?.enabled === false) return counts;
  if (!config?.ownerUid) throw new PollActionError('Configure the poll report owner before finalizing polls.', 409);
  const owner = await adminAuth().getUser(config.ownerUid);
  if (!owner.email) throw new PollActionError('The configured owner needs an email address.', 409);
  let totalMembers = 0;
  let pageToken: string | undefined;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    totalMembers += page.users.filter(user => !user.disabled).length;
    pageToken = page.pageToken;
  } while (pageToken);
  for (const snap of due) {
    try {
      const result = await finalizePoll(snap.id, config.ownerUid, owner.email, totalMembers, now);
      if (result) { counts.processed++; counts.booked += Number(result.booked); counts.reportsQueued += Number(result.reportQueued); counts.ties += Number(result.tied); }
    } catch (error) { counts.errors.push({ pollId: snap.id, error: error instanceof Error ? error.message : 'Poll finalization failed' }); }
  }
  return counts;
}

export async function tieOwnerQuestions(now = new Date()) {
  const docs = await decisions(adminDb()).get();
  return docs.docs.filter(snap => { const d = snap.data() as Decision; return ['pending', 'awaiting_owner'].includes(d.state) && Date.parse(d.expiresAt) > now.getTime(); }).slice(0, 20).map(snap => {
    const d = snap.data() as Decision;
    return buildTieQuestion({ pollId: d.pollId, title: d.title, rows: d.choices, reportText: d.reportText, expiresAt: d.expiresAt });
  });
}

function validateCallback(id: string, body: Record<string, unknown>) {
  if (!/^tie-[^/]+$/.test(id) || typeof body.eventId !== 'string' || !body.eventId.trim() || body.eventId.length > 200 || (body.type !== 'question_sent' && body.type !== 'answered')) throw new PollActionError('Invalid tie event.');
  const expected = `hq_auto_${hash(`gayiclub:${id}`).slice(0, 32)}`;
  if (body.queryId !== expected) throw new PollActionError('Questionnaire does not match this request.');
  return body.eventId;
}
function selectedChoice(decision: Decision, answers: unknown) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length !== 1) throw new PollActionError('Choose one tied date.');
  const label = (answers as Record<string, unknown>).winning_date;
  const choice = decision.choices.find(c => c.label === label);
  if (!choice) throw new PollActionError('Choose one of the tied dates.');
  return choice;
}
function dataDecision(snapshot: DocumentSnapshot): Decision {
  if (!snapshot.exists) throw new PollActionError('Unknown tie decision.', 404);
  return snapshot.data() as Decision;
}
export async function recordTieOwnerEvent(id: string, body: Record<string, unknown>, now = new Date()) {
  const externalEventId = validateCallback(id, body);
  const db = adminDb();
  const ref = decisions(db).doc(id);
  const ledger = ref.collection('events').doc(hash(externalEventId));
  return db.runTransaction(async tx => {
    const [snap, previous] = await Promise.all([tx.get(ref), tx.get(ledger)]);
    const decision = dataDecision(snap);
    if (tieId(decision.pollId) !== id || (decision.queryId && decision.queryId !== body.queryId)) throw new PollActionError('Questionnaire does not match this request.');
    if (previous.exists) {
      if (previous.data()?.type !== body.type) throw new PollActionError('Event ID already used for another event type.');
      return { ok: true as const, ...(decision.eventId ? { eventId: decision.eventId } : {}) };
    }
    let eventId = decision.eventId;
    if (body.type === 'answered' && decision.state !== 'resolved') {
      if (!['pending', 'awaiting_owner'].includes(decision.state) || !(Date.parse(decision.expiresAt) > now.getTime())) throw new PollActionError('Tie decision has expired.', 409);
      const choice = selectedChoice(decision, body.answers);
      const ctx = await readPoll(db, tx, decision.pollId);
      if (!ctx.poll.event_id && ctx.poll.result_status !== 'awaiting_tie_break') throw new PollActionError('This poll is no longer awaiting a tied date.', 409);
      const booked = createBooking(db, tx, ctx, { optionId: choice.optionId }, decision.ownerUid, now);
      eventId = booked.event.id;
      tx.update(ref, { state: 'resolved', queryId: body.queryId, eventId, resolvedAt: nowIso(now), selectedOptionId: ctx.poll.event_id ? ctx.poll.selected_option_id || null : choice.optionId });
    } else if (body.type === 'question_sent') {
      tx.update(ref, { queryId: body.queryId, questionnaireUrl: typeof body.questionnaireUrl === 'string' ? body.questionnaireUrl : null, ...(decision.state === 'pending' ? { state: 'awaiting_owner' } : {}) });
    }
    tx.create(ledger, { type: body.type, receivedAt: nowIso(now) });
    return { ok: true as const, ...(eventId ? { eventId } : {}) };
  });
}
