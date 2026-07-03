"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Check,
  Users,
  Repeat,
} from 'lucide-react';
import type { Event } from '@/types/supabase';
import { getEventById } from '@/lib/events';
import { getRsvpedEventIds, saveRsvp, deleteRsvp, getEventAttendees } from '@/lib/rsvp';
import { supabase } from '@/lib/supabase';
import { describeRecurrence } from '@/lib/recurrence';
import CalendarExportButtons from '@/components/CalendarExportButtons';
import { Button, Alert } from '@/components/ui';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isRsvped, setIsRsvped] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const [e, authData, attendees] = await Promise.all([
        getEventById(eventId),
        supabase.auth.getUser(),
        getEventAttendees(eventId),
      ]);
      setEvent(e);
      setAttendeeCount(attendees.count);
      const uid = authData.data.user?.id || null;
      setUserId(uid);
      if (uid) {
        const ids = await getRsvpedEventIds(uid);
        setIsRsvped(ids.includes(eventId));
      }
      setLoading(false);
    })();
  }, [eventId]);

  const handleRsvp = async () => {
    if (!userId) {
      setMessage({ text: 'Please sign in to RSVP.', variant: 'info' });
      return;
    }
    setRsvpLoading(true);
    const ok = await saveRsvp(userId, event!.id);
    if (ok) {
      setIsRsvped(true);
      setAttendeeCount(prev => prev + 1);
      setMessage({ text: `You're going to "${event!.title}"!`, variant: 'success' });
    } else {
      setMessage({ text: 'Failed to RSVP. Please try again.', variant: 'error' });
    }
    setRsvpLoading(false);
  };

  const handleCancelRsvp = async () => {
    if (!userId) return;
    setRsvpLoading(true);
    const ok = await deleteRsvp(userId, event!.id);
    if (ok) {
      setIsRsvped(false);
      setAttendeeCount(prev => Math.max(0, prev - 1));
      setMessage({ text: `Canceled RSVP for "${event!.title}".`, variant: 'success' });
    } else {
      setMessage({ text: 'Failed to cancel RSVP.', variant: 'error' });
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
      <div className="card-tinted p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute -top-32 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,45,155,0.18), transparent 70%)' }}
        />
        <div className="relative space-y-4">
          {/* Badges */}
          <div className="flex items-center flex-wrap gap-2">
            {isPast && (
              <span className="badge">Past event</span>
            )}
            {recurrence && (
              <span className="badge badge-purple">
                <Repeat className="w-3 h-3" />
                {recurrence}
              </span>
            )}
            {attendeeCount > 0 && (
              <span className="badge badge-cyan">
                <Users className="w-3 h-3" />
                {attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-display-md font-display font-bold text-foreground tracking-tight">
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
          {/* RSVP */}
          {!isPast && (
            isRsvped ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <Check className="w-4 h-4" />
                  RSVPed
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelRsvp}
                  disabled={rsvpLoading}
                >
                  {rsvpLoading ? 'Canceling…' : 'Cancel RSVP'}
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleRsvp}
                disabled={rsvpLoading}
              >
                {rsvpLoading ? 'Saving…' : 'RSVP to this event'}
              </Button>
            )
          )}

          {/* Calendar exports */}
          <CalendarExportButtons event={event} />

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
