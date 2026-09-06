"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowDown, Trophy, CalendarPlus, Mail, Users } from 'lucide-react';
import { authHeader, currentUser } from '@/lib/firebase/authClient';
import {
  getPoll,
  getMyBallot,
  submitBallot,
  getPollVotes,
  tallyPoll,
  selectPollWinner,
  formatOption,
  type PollWithOptions,
  type PollTally,
} from '@/lib/polls';
import { isPollOpen, newYorkDate, newYorkMeetingTime, formatPollDeadline } from '@/lib/poll-scheduling';
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
  const [unavailable, setUnavailable] = useState<string[]>([]);
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
    try {
    const [p, user] = await Promise.all([getPoll(pollId), currentUser()]);
    const uid = user?.uid ?? null;
    setUserId(uid);
    setPoll(p);
    if (p && uid) {
      const [mine, admin, votes] = await Promise.all([
        getMyBallot(pollId, uid),
        isCurrentUserAdmin(uid),
        getPollVotes(pollId),
      ]);
      setIsAdmin(admin);
      const optionIds = p.options.map(o => o.id);
      const known = (mine?.availableOptionIds ?? []).filter(id => optionIds.includes(id));
      const unavailableIds = (mine?.unavailableOptionIds ?? []).filter(id => optionIds.includes(id));
      setHasVoted(mine !== null);
      setUnavailable(unavailableIds);
      setOrder([...known, ...optionIds.filter(id => !known.includes(id) && !unavailableIds.includes(id))]);
      setMeetingTime(p.default_meeting_time ?? '');
      setMeetingLocation(p.default_meeting_location ?? '');
      const t = tallyPoll(p.options, votes);
      setTally(t);
      setChosenOptionId(previous => previous || (p.tie_option_ids?.[0] ?? t.ranked[0]?.option.id ?? ''));
    }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not load poll responses.', variant: 'error' });
    } finally { setLoading(false); }
  }, [pollId]);

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
    try {
      await submitBallot(pollId, { availableOptionIds: order, unavailableOptionIds: unavailable });
      setHasVoted(true);
      setMessage({ text: 'Your availability and ranking are saved. You can update them before the poll closes.', variant: 'success' });
      const votes = await getPollVotes(pollId);
      setTally(tallyPoll(poll.options, votes));
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not save your availability.', variant: 'error' });
    } finally { setSaving(false); }
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
    if (opt.date_only || poll.date_only) {
      try { newYorkMeetingTime(newYorkDate(opt.option_datetime), meetingTime); }
      catch (error) {
        setMessage({ text: error instanceof Error ? error.message : 'Choose a valid New York meeting time.', variant: 'error' });
        return;
      }
    }
    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/polls/${encodeURIComponent(poll.id)}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ optionId: chosenOptionId, meetingTime: meetingTime || undefined, title: meetingTitle.trim() || 'Gay I Club Meeting', location: meetingLocation.trim(), description: meetingDescription.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not book the meeting.');
      setMessage({ text: 'Meeting booked and linked to this poll.', variant: 'success' });
      await load();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Could not book the meeting.', variant: 'error' });
    } finally { setCreating(false); }
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
  const result = tally ? selectPollWinner(tally) : null;
  const winner = result?.status === 'winner' ? tally?.ranked.find(r => r.option.id === result.optionIds[0]) : null;
  const awaitingTie = !!poll.tie_option_ids?.length && !poll.event_id;
  const bookingOptions = tally?.ranked.filter(r => !awaitingTie || poll.tie_option_ids?.includes(r.option.id)) ?? [];
  const toggleUnavailable = (id: string, checked: boolean) => {
    setUnavailable(previous => checked ? [...previous, id] : previous.filter(value => value !== id));
    setOrder(previous => checked ? previous.filter(value => value !== id) : [...previous, id]);
  };

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
              <Users className="w-3 h-3" /> {tally.voters} {tally.voters === 1 ? 'respondent' : 'respondents'}
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
            YOUR AVAILABILITY & RANKING
          </div>
          <p className="text-sm text-foreground-muted">Mark dates you cannot attend, then rank the remaining dates with your best date first. You can submit even if none work.</p>
          {[...order, ...unavailable].map(id => {
            const idx = order.indexOf(id);
            const cannotAttend = unavailable.includes(id);
            const o = optionById.get(id);
            if (!o) return null;
            return (
              <div key={id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated border border-border">
                <div className="w-7 h-7 rounded-full bg-primary-muted text-background text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  {cannotAttend ? '—' : idx + 1}
                </div>
                <div className="flex-1 text-sm font-semibold text-foreground">
                  {formatOption(o)}
                  <label className="mt-2 flex items-center gap-2 text-xs font-normal text-foreground-muted">
                    <input type="checkbox" checked={cannotAttend} disabled={saving} onChange={e => toggleUnavailable(id, e.target.checked)} />
                    Can’t make this date
                  </label>
                </div>
                <button onClick={() => move(idx, -1)} disabled={saving || cannotAttend || idx === 0} className="p-1.5 border border-border-subtle rounded text-foreground-subtle hover:text-foreground disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(idx, 1)} disabled={saving || cannotAttend || idx === order.length - 1} className="p-1.5 border border-border-subtle rounded text-foreground-subtle hover:text-foreground disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : hasVoted ? 'Update my response' : 'Submit my response'}
          </Button>
        </div>
      )}

      {tally && (hasVoted || isAdmin || !isOpen) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Current standings</h2>
          </div>
          {result?.status === 'tie' && <p className="text-sm text-foreground-muted mb-3">Tied for the lead: {result.optionIds.map(id => formatOption(optionById.get(id)!)).join('; ')}. Robert chooses the date if the final results are tied.</p>}
          {result?.status === 'no_available_dates' && <p className="text-sm text-foreground-muted mb-3">No date has any available respondents.</p>}
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
                    <th className="py-1 pr-3 text-right">Can attend</th>
                    <th className="py-1 pr-3 text-right">Can’t attend</th>
                    <th className="py-1 pr-3 text-right">Unanswered</th>
                    <th className="py-1 pr-3 text-right">1st picks</th>
                    <th className="py-1 text-right">Avg rank</th>
                  </tr>
                </thead>
                <tbody>
                  {tally.ranked.map((r, idx) => (
                    <tr key={r.option.id} className={idx === 0 ? 'font-semibold text-foreground' : 'text-foreground-muted'}>
                      <td className="py-1.5 pr-3">{result?.status === 'tie' && result.optionIds.includes(r.option.id) ? 'Tie' : idx + 1}</td>
                      <td className="py-1.5 pr-3">{formatOption(r.option)}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.points}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.available}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.unavailable}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.unanswered}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{r.firstChoice}</td>
                      <td className="py-1.5 text-right font-mono">{r.avgRank ? r.avgRank.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-foreground-faint mt-2">
                Points use a Borda count: with {poll.options.length} dates, a first choice is worth {poll.options.length} points and each lower available preference earns one fewer point. Unavailable dates earn zero. Unanswered counts missing choices among respondents.
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
                <span className="font-semibold text-foreground text-sm">{awaitingTie ? 'Choose the tied date and book' : 'Book the meeting'}</span>
                {winner && <span className="text-xs text-foreground-faint">(leader: {formatOption(winner.option)})</span>}
              </div>
              <select aria-label="Meeting date" className="input-field w-full text-sm" value={chosenOptionId} onChange={e => setChosenOptionId(e.target.value)}>
                {bookingOptions.map(r => (
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
