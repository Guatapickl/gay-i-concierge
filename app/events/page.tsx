"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getUpcomingEvents } from '@/lib/events';
import { saveRsvp, deleteRsvp, getRsvpedEventIds } from '@/lib/rsvp';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types/supabase';
import { Button, Alert, LoadingSpinner } from '@/components/ui';
import EventListItem from '@/components/EventListItem';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpMessage, setRsvpMessage] = useState<{ text: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [rsvpedEvents, setRsvpedEvents] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [pendingRsvpEventId, setPendingRsvpEventId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [data, authData] = await Promise.all([
          getUpcomingEvents(),
          supabase.auth.getUser(),
        ]);
        setEvents(data);
        const uid = authData.data.user?.id || null;
        setUserId(uid);
        if (uid) {
          const [ids, adminResult] = await Promise.all([
            getRsvpedEventIds(uid),
            supabase
              .from('app_admins')
              .select('user_id', { count: 'exact', head: true })
              .eq('user_id', uid),
          ]);
          setRsvpedEvents(new Set(ids));
          setIsAdmin(!!adminResult.count && adminResult.count > 0);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <LoadingSpinner text="Loading events..." className="py-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md font-display font-bold text-foreground">
            Events
          </h1>
          <p className="text-foreground-muted mt-1">
            Upcoming gatherings and meetups
          </p>
        </div>
        {isAdmin && (
          <Link href="/events/new">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </Link>
        )}
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-foreground-muted">No upcoming events</p>
          <p className="text-sm text-foreground-subtle mt-1">
            Check back soon for new events
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {events.map(event => (
            <EventListItem
              key={event.id}
              event={event}
              isRsvped={rsvpedEvents.has(event.id)}
              isAdmin={isAdmin}
              isRsvpPending={pendingRsvpEventId === event.id}
              onRsvp={async () => {
                if (!userId) {
                  setRsvpMessage({ text: 'Please sign in to RSVP', variant: 'info' });
                  return;
                }
                setPendingRsvpEventId(event.id);
                try {
                  const success = await saveRsvp(userId, event.id);
                  if (success) {
                    setRsvpMessage({ text: `RSVPed for "${event.title}"`, variant: 'success' });
                    setRsvpedEvents(prev => new Set(prev).add(event.id));
                  } else {
                    setRsvpMessage({ text: 'Failed to RSVP. Please try again.', variant: 'error' });
                  }
                } finally {
                  setPendingRsvpEventId(null);
                }
              }}
              onCancelRsvp={async () => {
                if (!userId) {
                  setRsvpMessage({ text: 'Please sign in first', variant: 'info' });
                  return;
                }
                setPendingRsvpEventId(event.id);
                try {
                  const ok = await deleteRsvp(userId, event.id);
                  if (ok) {
                    setRsvpedEvents(prev => {
                      const n = new Set(prev);
                      n.delete(event.id);
                      return n;
                    });
                    setRsvpMessage({ text: `Canceled RSVP for "${event.title}"`, variant: 'success' });
                  } else {
                    setRsvpMessage({ text: 'Failed to cancel RSVP', variant: 'error' });
                  }
                } finally {
                  setPendingRsvpEventId(null);
                }
              }}
            />
          ))}
        </ul>
      )}

      {/* Messages */}
      {rsvpMessage && (
        <Alert
          variant={rsvpMessage.variant}
          onClose={() => setRsvpMessage(null)}
        >
          {rsvpMessage.text}
        </Alert>
      )}
    </div>
  );
}
