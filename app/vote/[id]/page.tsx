"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowDown, Trophy, CalendarPlus, Mail, Users } from 'lucide-react';
import { authHeader, currentUser } from '@/lib/firebase/authClient';
import {
  getPoll,
  getMyRanking,
  submitRanking,
  getPollVotes,
  tallyPoll,
  closePoll,
  formatOption,
  type PollWithOptions,
  type PollTally,
} from '@/lib/polls';
import { isPollOpen, newYorkDate, newYorkMeetingTime, formatPollDeadline } from '@/lib/poll-scheduling';
import { createEvent, getUpcomingEvents } from '@/lib/events';
import { isCurrentUserAdmin } from '@/lib/isAdmin';
import type { MeetingPollOption } from '@/types/supabase';
import { Button, FormInput, FormTextarea, Alert, LoadingSpinner } from '@/components/ui';

export default function PollPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);

  const [poll, setPoll] = useState<PollWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tally, setTally] = useState<PollTally | null>(null);
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'error' | 'info' } | null>(null);

  // Admin: create meeting
  const [chosenOptionId, setChosenOptionId] = useState<string>('');
  const [meetingTitle, setMeetingTitle] = useState('Gay I Club Meeting');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [creating, setCreating] = useState(false);
  const [emailing, setEmailing] = useState<'invite' | 'result' | null>(null);

  const load = useCallback(async () => {
    if (!pollId) return;
    const [p, user] = await Promise.all([getPoll(pollId), currentUser()]);
    const uid = user?.uid ?? null;
    setUserId(uid);
    setPoll(p);
    if (p && uid) {
      const [mine, admin, votes] = await Promise.all([
        getMyRanking(pollId, uid),
        isCurrentUserAdmin(uid),
        getPollVotes(pollId),
      ]);
      setIsAdmin(admin);
      const optionIds = p.options.map(o => o.id);
      const known = mine.filter(id => optionIds.includes(id));
      setHasVoted(known.length > 0);
      setOrder([...known, ...optionIds.filter(id => !known.includes(id))]);
      const t = tallyPoll(p.options, votes);
      setTally(t);
      if (!chosenOptionId && t.ranked[0]) setChosenOptionId(t.ranked[0].option.id);
    }
    setLoading(false);
  }, [pollId, chosenOptionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const optionById = useMemo(() => {
    const m = new Map<string, MeetingPollOption>();
    for (const o of poll?.options || []) m.set(o.id, o);
    return m;
  }, [poll]);

  const move = (idx: number, dir: -1 | 1) => {
    setOrder(prev => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const submit = async () => {
    if (!pollId || !userId || !poll) return;
    if (!isPollOpen(poll)) {
      setClockNow(Date.now());
      setMessage({ text: 'Voting has closed for this poll.', variant: 'info' });
      return;
    }
    setSaving(true);
    const ok = await submitRanking(pollId, userId, order);
    setSaving(false);
    if (ok) {
      setHasVoted(true);
      setMessage({ text: 'Your ranking is saved. You can change it any time before the poll closes.', variant: 'success' });
      const votes = await getPollVotes(pollId);
      if (poll) setTally(tallyPoll(poll.options, votes));
    } else {
      setMessage({ text: 'Could not save your ranking. Please try again.', variant: 'error' });
    }
  };

  const notify = async (type: 'invite' | 'result') => {
    if (!pollId) return;
    setEmailing(type);
    setMessage(null);
    try {
      const res = await fetch(`/api/polls/${pollId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data?.error || 'Email failed.', variant: 'error' });
      } else {
        setMessage({ text: `Queued ${data.queued} email${data.queued === 1 ? '' : 's'}.`, variant: 'success' });
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), variant: 'error' });
    } finally {
      setEmailing(null);
    }
  };

  const createMeeting = async () => {
    if (!poll || !chosenOptionId || !isAdmin || poll.event_id) return;
    const opt = optionById.get(chosenOptionId);
    if (!opt) return;
    let eventDateTime = opt.option_datetime;
    if (opt.date_only || poll.date_only) {
      try {
        eventDateTime = newYorkMeetingTime(newYorkDate(opt.option_datetime), meetingTime);
      } catch (error) {
        setMessage({ text: error instanceof Error ? error.message : 'Choose a valid New York meeting time.', variant: 'error' });
        return;
      }
    }
    setCreating(true);
    setMessage(null);
    // Guard against double-creating the same meeting.
    const upcoming = await getUpcomingEvents();
    const dup = upcoming.find(e => Math.abs(new Date(e.event_datetime).getTime() - new Date(eventDateTime).getTime()) < 60_000);
    let eventId: string | null = dup?.id ?? null;
    if (!eventId) {
      const ok = await createEvent({
        title: meetingTitle.trim() || 'Gay I Club Meeting',
        description: meetingDescription.trim() || null,
        event_datetime: eventDateTime,
        location: meetingLocation.trim() || null,
      });
      if (!ok) {
        setCreating(false);
        setMessage({ text: 'Could not create the meeting. Admin permission may be missing.', variant: 'error' });
        return;
      }
      const after = await getUpcomingEvents();
      eventId = after.find(e => new Date(e.event_datetime).toISOString() === new Date(eventDateTime).toISOString())?.id ?? null;
    }
    const closed = await closePoll(poll.id, eventId);
    setCreating(false);
    if (closed) {
      setMessage({ text: dup ? 'A meeting already existed at that time; poll closed and linked to it.' : 'Meeting created and poll closed.', variant: 'success' });
      await load();
    } else {
      setMessage({ text: 'Meeting created but the poll could not be closed.', variant: 'error' });
    }
  };

  if (loading) return <LoadingSpinner text="Loading poll…" className="mt-8" />;

  if (!userId) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto animate-fade-in">
        <p className="font-semibold text-foreground mb-1">Sign in to vote</p>
        <p className="text-sm text-foreground-muted mb-4">This poll is for club members.</p>
        <Link href="/auth/sign-in" className="btn-brand inline-flex text-sm">Sign in</Link>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto animate-fade-in">
        <p className="font-semibold text-foreground mb-1">Poll not found</p>
        <Button variant="secondary" onClick={() => router.push('/vote')}>All polls</Button>
      </div>
    );
  }

  const isOpen = isPollOpen(poll, clockNow);
  const chosenOption = optionById.get(chosenOptionId);
  const needsMeetingTime = !!(chosenOption?.date_only || poll.date_only);
  const winner = tally?.ranked[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link href="/vote" className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> All polls
      </Link>

      <div className="card-tinted p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className={`badge ${isOpen ? 'badge-cyan' : ''}`}>{isOpen ? 'Voting open' : 'Closed'}</span>
          {tally && (
            <span className="badge badge-purple">
              <Users className="w-3 h-3" /> {tally.voters} {tally.voters === 1 ? 'vote' : 'votes'}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">{poll.title}</h1>
        {poll.description && <p className="text-foreground-muted mt-2 whitespace-pre-line">{poll.description}</p>}
        {poll.closes_at && (
          <p className="text-[11px] font-mono text-foreground-faint mt-3">
            Voting deadline: {formatPollDeadline(poll.closes_at)}
          </p>
        )}
        {!isOpen && poll.event_id && (
          <Link href={`/events/${poll.event_id}`} className="btn-brand inline-flex items-center gap-2 text-sm mt-4">
            View the scheduled meeting
          </Link>
        )}
      </div>

      {isOpen && (
        <div className="card p-5 space-y-3">
          <div className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono">
            YOUR RANKING — BEST DATE FIRST
          </div>
          {order.map((id, idx) => {
            const o = optionById.get(id);
            if (!o) return null;
            return (
              <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated border border-border">
                <div className="w-7 h-7 rounded-full bg-primary-muted text-background text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 text-sm font-semibold text-foreground">{formatOption(o)}</div>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 border border-border-subtle rounded text-foreground-subtle hover:text-foreground disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1} className="p-1.5 border border-border-subtle rounded text-foreground-subtle hover:text-foreground disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : hasVoted ? 'Update my ranking' : 'Submit my ranking'}
          </Button>
        </div>
      )}

      {tally && (hasVoted || isAdmin || !isOpen) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Current standings</h2>
          </div>
          {tally.voters === 0 ? (
            <p className="text-sm text-foreground-muted">No votes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono text-foreground-faint">
                    <th className="py-1 pr-3">#</th>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3 text-right">Points</th>
                    <th className="py-1 pr-3 text-right">1st picks</th>
                    <th className="py-1 text-right">Avg rank</th>
                  </tr>
                </thead>
                <tbody>
                  {tally.ranked.map((r, idx) => (
                    <tr key={r.option.id} className={idx === 0 ? 'font-semibold text-foreground' : 'text-foreground-muted'}>
                      <td className="py-1.5 pr-3">{idx + 1}</td>
                      <td className="py-1.5 pr-3">{formatOption(r.option)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.points}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.firstChoice}</td>
                      <td className="py-1.5 text-right font-mono">{r.avgRank ? r.avgRank.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-foreground-faint mt-2">
                Points use a Borda count: with {poll.options.length} dates, a first choice is worth {poll.options.length} points and a last choice 1.
              </p>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="card p-5 space-y-4">
          <div className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono">ADMIN</div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => notify('invite')} disabled={!!emailing || !isOpen}>
              <Mail className="w-4 h-4" /> {emailing === 'invite' ? 'Sending…' : 'Email members to vote'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => notify('result')} disabled={!!emailing || isOpen || !poll.event_id}>
              <Mail className="w-4 h-4" /> {emailing === 'result' ? 'Sending…' : 'Email the result'}
            </Button>
          </div>

          {!poll.event_id && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Book the meeting</span>
                {winner && <span className="text-xs text-foreground-faint">(leader: {formatOption(winner.option)})</span>}
              </div>
              <select aria-label="Meeting date" className="input-field w-full text-sm" value={chosenOptionId} onChange={e => setChosenOptionId(e.target.value)}>
                {tally?.ranked.map(r => (
                  <option key={r.option.id} value={r.option.id}>
                    {formatOption(r.option)} · {r.points} pts
                  </option>
                ))}
              </select>
              {needsMeetingTime && (
                <div className="space-y-1">
                  <FormInput type="time" label="Meeting time (America/New_York)" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} required />
                  <p className="text-xs text-foreground-muted">Members voted on the date only. Choose the meeting start time in New York before booking.</p>
                </div>
              )}
              <FormInput value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="Meeting title" />
              <FormInput value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} placeholder="Location" />
              <FormTextarea value={meetingDescription} onChange={e => setMeetingDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
              <Button variant="primary" onClick={createMeeting} disabled={creating || !chosenOptionId || (needsMeetingTime && !meetingTime)}>
                {creating ? 'Booking…' : 'Create meeting & close poll'}
              </Button>
              <p className="text-xs text-foreground-faint">
                Creates the calendar event, closes voting, and links the poll to it. Then use “Email the result” to tell everyone.
              </p>
            </div>
          )}
        </div>
      )}

      {message && <Alert variant={message.variant} onClose={() => setMessage(null)}>{message.text}</Alert>}
    </div>
  );
}
