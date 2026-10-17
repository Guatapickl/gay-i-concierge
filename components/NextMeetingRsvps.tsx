"use client";

import Link from 'next/link';
import { Calendar, CalendarX, Check, Clock, HelpCircle, MapPin, RefreshCw, ShieldAlert, Users, X } from 'lucide-react';
import type { MeetingAttendee, MeetingSummary, NextMeetingRsvps as NextMeetingRsvpsData } from '@/lib/rsvp';
import { RSVP_LABELS, RSVP_STATUSES, type RsvpStatus } from '@/lib/rsvpStatus';
import { Alert, Button, LoadingSpinner } from '@/components/ui';
import MeetingReminderPanel from '@/components/MeetingReminderPanel';

/**
 * Presentational half of the organizer's "Next meeting RSVPs" view. Every
 * state the page can be in is rendered differently on purpose: loading,
 * signed out, not an organizer, load failure, no upcoming meeting, a meeting
 * with zero RSVPs, and a meeting with attendees.
 */

export type RsvpViewState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: NextMeetingRsvpsData };

type Props = {
  state: RsvpViewState;
  refreshing?: boolean;
  onRefresh?: () => void;
  onSelectEvent?: (eventId: string) => void;
};

const dateOf = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function formatMeetingDate(iso: string | null): string {
  const d = dateOf(iso);
  return d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be announced';
}

export function formatMeetingTime(iso: string | null): string | null {
  const d = dateOf(iso);
  return d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
}

function formatShortDate(iso: string | null): string {
  const d = dateOf(iso);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'date TBA';
}

function formatRsvpedAt(iso: string | null): string {
  const d = dateOf(iso);
  return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'time not recorded';
}

/** What to print for one attendee, and why, when there is no name on file. */
export function attendeeLabel(attendee: MeetingAttendee): { primary: string; note: string | null } {
  if (attendee.name) return { primary: attendee.name, note: null };
  if (attendee.email) return { primary: attendee.email, note: 'No name on their profile, so their sign-in email is shown.' };
  return { primary: 'Member without a name on file', note: `Account ID ${attendee.profile_id}` };
}

export default function NextMeetingRsvps({ state, refreshing = false, onRefresh, onSelectEvent }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="eyebrow mb-2">Organizer tools</p>
          <h1 className="page-heading">Next meeting RSVPs</h1>
          <p className="text-foreground-muted mt-1">Who is going, who might, and who can&apos;t make the club&apos;s next meeting. Visible to organizers only.</p>
        </div>
        <Link href="/events" className="text-sm text-primary whitespace-nowrap">All events →</Link>
      </div>
      <Body state={state} refreshing={refreshing} onRefresh={onRefresh} onSelectEvent={onSelectEvent} />
    </div>
  );
}

function Body({ state, refreshing, onRefresh, onSelectEvent }: Required<Pick<Props, 'state' | 'refreshing'>> & Pick<Props, 'onRefresh' | 'onSelectEvent'>) {
  switch (state.status) {
    case 'loading':
      return <LoadingSpinner text="Loading RSVPs..." className="py-12" />;
    case 'signed-out':
      return (
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold">Sign in to see RSVPs</p>
          <p className="text-sm text-foreground-muted mt-1 mb-5">This organizer view needs your club account.</p>
          <Link href="/auth/sign-in" className="btn-brand">Sign in</Link>
        </div>
      );
    case 'forbidden':
      return (
        <div className="card p-8 text-center" data-state="forbidden">
          <ShieldAlert className="w-6 h-6 mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold">Organizers only</p>
          <p className="text-sm text-foreground-muted mt-1 max-w-md mx-auto">You&apos;re signed in, but this account isn&apos;t on the organizer list, so the attendee list stays hidden.</p>
          <Link href="/events" className="btn-secondary mt-5">Back to events</Link>
        </div>
      );
    case 'error':
      return (
        <div className="space-y-4" data-state="error">
          <Alert variant="error">Couldn&apos;t load RSVPs: {state.message}</Alert>
          <p className="text-sm text-foreground-muted">Nothing was loaded, so this is not a zero-RSVP result. Try again in a moment.</p>
          <Button variant="secondary" size="md" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      );
    case 'ready':
      return <Ready data={state.data} refreshing={refreshing} onRefresh={onRefresh} onSelectEvent={onSelectEvent} />;
  }
}

function Ready({ data, refreshing, onRefresh, onSelectEvent }: { data: NextMeetingRsvpsData; refreshing: boolean } & Pick<Props, 'onRefresh' | 'onSelectEvent'>) {
  const { event, is_next_meeting: isNext, upcoming_events: upcoming, attendees, count, generated_at: generatedAt } = data;
  const counts = data.counts ?? { yes: attendees.length, maybe: 0, no: 0 };

  if (!event) {
    return (
      <div className="card p-8 text-center" data-state="no-upcoming-meeting">
        <CalendarX className="w-6 h-6 mx-auto mb-3 text-primary" />
        <p className="text-lg font-semibold">No upcoming meeting</p>
        <p className="text-sm text-foreground-muted mt-1 max-w-md mx-auto">Nothing is scheduled after right now, so there is no meeting to collect RSVPs for. Once the next meeting is on the calendar, its RSVPs show up here.</p>
        <div className="flex flex-wrap justify-center gap-3 mt-5">
          <Link href="/events/new" className="btn-secondary">Schedule an event</Link>
          <Button variant="ghost" size="md" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const options: { value: string; label: string }[] = upcoming.map((item, index) => ({
    value: item.id,
    label: `${index === 0 ? 'Next meeting: ' : ''}${item.title || 'Untitled event'} · ${formatShortDate(item.event_datetime)}`,
  }));
  if (!upcoming.some(item => item.id === event.id)) {
    options.unshift({ value: event.id, label: `${event.title || 'Untitled event'} · ${formatShortDate(event.event_datetime)} (not upcoming)` });
  }
  const showSelector = options.length > 1;
  const time = formatMeetingTime(event.event_datetime);

  return (
    <div className="space-y-6" data-state={count === 0 ? 'zero-rsvps' : 'attendees'}>
      <MeetingCard event={event} isNext={isNext} time={time} />

      <div className="flex flex-wrap items-center gap-3">
        <span className="badge badge-cyan"><Users className="w-3 h-3" />{counts.yes} going</span>
        <span className="badge"><HelpCircle className="w-3 h-3" />{counts.maybe} maybe</span>
        <span className="badge"><X className="w-3 h-3" />{counts.no} can&apos;t make it</span>
        <span className="text-xs font-mono text-foreground-muted">Updated {formatRsvpedAt(generatedAt)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {showSelector && (
            <label className="flex items-center gap-2 text-xs text-foreground-muted">
              <span className="sr-only sm:not-sr-only">Meeting</span>
              <select
                aria-label="Meeting"
                value={event.id}
                onChange={e => onSelectEvent?.(e.target.value)}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground"
              >
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}
          <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing} aria-label="Refresh RSVPs">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {count === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-6 h-6 mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold">No RSVPs yet</p>
          <p className="text-sm text-foreground-muted mt-1 max-w-md mx-auto">This meeting is on the calendar, but nobody has answered so far. Refresh to check again.</p>
        </div>
      ) : (
        RSVP_STATUSES.map(status => {
          const group = attendees.filter(a => (a.status ?? 'yes') === status);
          if (group.length === 0) return null;
          return (
            <section key={status} className="space-y-2" data-rsvp-group={status}>
              <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                <AnswerIcon status={status} />
                {RSVP_LABELS[status].short} · {group.length}
              </h3>
              <ol className="card divide-y divide-border" aria-label={RSVP_LABELS[status].short}>
                {group.map((attendee, index) => <AttendeeRow key={attendee.id} attendee={attendee} position={index + 1} />)}
              </ol>
            </section>
          );
        })
      )}

      <MeetingReminderPanel key={event.id} eventId={event.id} eventTitle={event.title || 'Untitled event'} />
    </div>
  );
}

function MeetingCard({ event, isNext, time }: { event: MeetingSummary; isNext: boolean; time: string | null }) {
  const d = dateOf(event.event_datetime);
  return (
    <section className="card p-6">
      <div className="flex gap-5">
        <div className="w-16 h-20 shrink-0 border border-border rounded-md bg-surface-elevated flex flex-col items-center justify-center">
          <span className="eyebrow">{d ? d.toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}</span>
          <span className="text-3xl font-display">{d ? d.getDate() : '–'}</span>
        </div>
        <div className="min-w-0 space-y-2">
          <span className={`badge ${isNext ? 'badge-primary' : ''}`}>{isNext ? 'Next meeting' : 'Selected event'}</span>
          <h2 className="text-xl font-display font-semibold">{event.title || 'Untitled event'}</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-foreground-muted">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />{formatMeetingDate(event.event_datetime)}</span>
            {time && <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{time}</span>}
            {event.location && <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{event.location}</span>}
          </div>
          <Link href={`/events/${encodeURIComponent(event.id)}`} className="inline-block text-sm text-primary">Open event page →</Link>
        </div>
      </div>
    </section>
  );
}

function AnswerIcon({ status }: { status: RsvpStatus }) {
  if (status === 'yes') return <Check className="w-4 h-4 text-success" />;
  if (status === 'maybe') return <HelpCircle className="w-4 h-4 text-primary" />;
  return <X className="w-4 h-4 text-foreground-muted" />;
}

function AttendeeRow({ attendee, position }: { attendee: MeetingAttendee; position: number }) {
  const label = attendeeLabel(attendee);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4">
      <div className="min-w-0">
        <span className="font-medium break-words"><span className="font-mono text-xs text-foreground-muted mr-2">{position}.</span>{label.primary}</span>
        {label.note && <p className="text-xs text-foreground-muted mt-0.5">{label.note}</p>}
      </div>
      <span className="font-mono text-xs text-foreground-muted whitespace-nowrap">{`Answered ${formatRsvpedAt(attendee.rsvped_at)}`}</span>
    </li>
  );
}
