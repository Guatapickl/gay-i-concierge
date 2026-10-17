"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Check,
  HelpCircle,
  X,
  Users,
  Repeat,
} from 'lucide-react';
import type { Event } from '@/types/supabase';
import { getEventById } from '@/lib/events';
import { getRsvpStatuses, saveRsvp, deleteRsvp, getEventAttendees, type RsvpCounts, type RsvpStatus } from '@/lib/rsvp';
import { RSVP_LABELS, applyAnswer, parseRsvpStatus } from '@/lib/rsvpStatus';
import { currentUser } from '@/lib/firebase/authClient';
import { isCurrentUserAdmin } from '@/lib/isAdmin';
import { describeRecurrence } from '@/lib/recurrence';
import { articleHost } from '@/lib/agendaArticles';
import CalendarExportButtons from '@/components/CalendarExportButtons';
import AgendaSuggestions from '@/components/AgendaSuggestions';
import { Button, Alert } from '@/components/ui';

const ANSWER_MESSAGES: Record<RsvpStatus, (title: string) => string> = {
  yes: title => `You're going to "${title}"!`,
  maybe: title => `Marked as maybe for "${title}". Update your answer when you know more.`,
  no: title => `Noted: you can't make "${title}". Thanks for letting us know.`,
};

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);
  // `?rsvp=yes|maybe|no` arrives from the answer buttons in reminder emails.
  const requestedAnswer = parseRsvpStatus(searchParams.get('rsvp'));

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<RsvpStatus | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [counts, setCounts] = useState<RsvpCounts>({ yes: 0, maybe: 0, no: 0 });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [e, user, attendees] = await Promise.all([
        getEventById(eventId),
        currentUser(),
        getEventAttendees(eventId),
      ]);
      setEvent(e);
      setCounts(attendees.counts);
      const uid = user?.uid || null;
      setUserId(uid);
      let current: RsvpStatus | null = null;
      if (uid) {
        const [statuses, admin] = await Promise.all([getRsvpStatuses(uid), isCurrentUserAdmin(uid)]);
        current = statuses[eventId] ?? null;
        setAnswer(current);
        setIsAdmin(admin);
      }
      setLoading(false);

      // Apply an answer carried in the link (from a reminder email) once the
      // member is signed in, then drop it from the URL so a reload does not
      // answer again.
      if (requestedAnswer && e && uid && new Date(e.event_datetime).getTime() >= Date.now()) {
        if (requestedAnswer !== current) {
          const ok = await saveRsvp(uid, e.id, requestedAnswer);
          if (ok) {
            setAnswer(requestedAnswer);
            setCounts(prev => applyAnswer(prev, current, requestedAnswer));
            setMessage({ text: ANSWER_MESSAGES[requestedAnswer](e.title), variant: 'success' });
          } else {
            setMessage({ text: 'We could not save your answer. Please try again below.', variant: 'error' });
          }
        } else {
          setMessage({ text: `${RSVP_LABELS[requestedAnswer].sentence}: that is already your answer for "${e.title}".`, variant: 'info' });
        }
        router.replace(`/events/${encodeURIComponent(e.id)}`);
      } else if (requestedAnswer && !uid) {
        setMessage({ text: 'Sign in to record your answer.', variant: 'info' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestedAnswer is read once per page load
  }, [eventId]);

  const handleAnswer = async (status: RsvpStatus) => {
    if (!userId) {
      setMessage({ text: 'Please sign in to RSVP.', variant: 'info' });
      return;
    }
    if (status === answer) return;
    setRsvpLoading(true);
    const ok = await saveRsvp(userId, event!.id, status);
    if (ok) {
      setCounts(prev => applyAnswer(prev, answer, status));
      setAnswer(status);
      setMessage({ text: ANSWER_MESSAGES[status](event!.title), variant: 'success' });
    } else {
      setMessage({ text: 'Failed to save your answer. Please try again.', variant: 'error' });
    }
    setRsvpLoading(false);
  };

  const handleClearAnswer = async () => {
    if (!userId || !answer) return;
    setRsvpLoading(true);
    const ok = await deleteRsvp(userId, event!.id);
    if (ok) {
      setCounts(prev => applyAnswer(prev, answer, null));
      setAnswer(null);
      setMessage({ text: `Cleared your answer for "${event!.title}".`, variant: 'success' });
    } else {
      setMessage({ text: 'Failed to clear your answer.', variant: 'error' });
    }
    setRsvpLoading(false);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: event!.title,
          text: event!.description || 'Check out this event!',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setMessage({ text: 'Link copied to clipboard!', variant: 'info' });
      }
    } catch {
      // user cancelled share dialog
    }
  };

  if (!eventId) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <p className="text-foreground-muted">Missing event ID.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-foreground-muted">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
          Loading event…
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <p className="text-lg font-semibold text-foreground mb-1">Event not found</p>
        <p className="text-foreground-muted text-sm mb-4">This event may have been removed or the link is invalid.</p>
        <Button variant="secondary" onClick={() => router.push('/events')}>
          Browse events
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.event_datetime);
  const recurrence = describeRecurrence(event.recurrence_rule);
  const isPast = eventDate.getTime() < Date.now();

  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero card */}
      <div className="card p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-32 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'var(--color-surface-elevated)' }}
        />
        <div className="relative space-y-4">
          {/* Badges */}
          <div className="flex items-center flex-wrap gap-2">
            {isPast && (
              <span className="badge">Past event</span>
            )}
            {recurrence && (
              <span className="badge badge-primary">
                <Repeat className="w-3 h-3" />
                {recurrence}
              </span>
            )}
            {counts.yes > 0 && (
              <span className="badge badge-cyan">
                <Users className="w-3 h-3" />
                {counts.yes} going
              </span>
            )}
            {counts.maybe > 0 && (
              <span className="badge">
                <HelpCircle className="w-3 h-3" />
                {counts.maybe} maybe
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="page-heading tracking-tight">
            {event.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-foreground-muted">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              {formattedTime}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {event.location}
              </span>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-foreground-muted whitespace-pre-line leading-relaxed max-w-2xl">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* RSVP answer */}
          {!isPast && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Are you coming?" data-testid="rsvp-answer">
              <span className="text-sm text-foreground-muted mr-1">{answer ? 'Your answer:' : 'Are you coming?'}</span>
              <Button
                variant={answer === 'yes' ? 'success' : 'primary'}
                size="sm"
                onClick={() => void handleAnswer('yes')}
                disabled={rsvpLoading}
                aria-pressed={answer === 'yes'}
              >
                <Check className="w-4 h-4" />
                {RSVP_LABELS.yes.action}
              </Button>
              <Button
                variant={answer === 'maybe' ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => void handleAnswer('maybe')}
                disabled={rsvpLoading}
                aria-pressed={answer === 'maybe'}
              >
                <HelpCircle className="w-4 h-4" />
                {RSVP_LABELS.maybe.action}
              </Button>
              <Button
                variant={answer === 'no' ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => void handleAnswer('no')}
                disabled={rsvpLoading}
                aria-pressed={answer === 'no'}
              >
                <X className="w-4 h-4" />
                {RSVP_LABELS.no.action}
              </Button>
              {answer && (
                <Button variant="ghost" size="sm" onClick={() => void handleClearAnswer()} disabled={rsvpLoading}>
                  {rsvpLoading ? 'Saving…' : 'Clear'}
                </Button>
              )}
            </div>
          )}

          {/* Calendar exports */}
          <CalendarExportButtons event={event} />

          {/* Organizer-only attendee list */}
          {isAdmin && (
            <Link href={`/events/rsvps?event=${encodeURIComponent(event.id)}`}>
              <Button variant="secondary" size="sm">
                <Users className="w-4 h-4" />
                See who&apos;s RSVP&apos;d
              </Button>
            </Link>
          )}

          {/* Share */}
          <Button variant="ghost" size="sm" onClick={handleShare} className="ml-auto">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Agenda */}
      {Array.isArray(event.agenda) && event.agenda.length > 0 && (
        <div className="card p-5 md:p-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">
            Agenda
          </h2>
          <ul className="space-y-3">
            {event.agenda.map((item, idx) => (
              <li key={idx} className="flex gap-3 p-3 rounded-lg bg-surface-elevated border border-border">
                {item?.time && (
                  <span className="text-sm font-mono text-primary-muted whitespace-nowrap pt-0.5">
                    {item.time}
                  </span>
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-foreground">{item?.title}</span>
                  {item?.speaker && (
                    <span className="text-sm text-foreground-muted ml-2">• {item.speaker}</span>
                  )}
                  {item?.notes && (
                    <p className="text-sm text-foreground-muted mt-1 whitespace-pre-line">
                      {item.notes}
                    </p>
                  )}
                  {item?.link && articleHost(item.link) && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary font-medium mt-1 break-all"
                    >
                      Read the article ↗ <span className="text-foreground-muted text-xs">{articleHost(item.link)}</span>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Link
              href={`/events/${event.id}/agenda`}
              className="text-sm text-primary-muted hover:text-primary transition-colors"
            >
              View full agenda →
            </Link>
          </div>
        </div>
      )}

      {/* Member topic suggestions */}
      {!isPast && <AgendaSuggestions eventId={event.id} />}

      {/* Notes */}
      {event.notes && (
        <div className="card p-5 md:p-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">
            Meeting Notes
          </h2>
          <div className="prose prose-sm text-foreground-muted whitespace-pre-line">
            {event.notes}
          </div>
        </div>
      )}

      {/* Alert messages */}
      {message && (
        <Alert variant={message.variant} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
    </div>
  );
}
