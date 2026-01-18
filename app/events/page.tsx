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
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);
  const [rsvpedEvents, setRsvpedEvents] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const data = await getUpcomingEvents();
      setEvents(data);
      setLoading(false);
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setUserId(uid);
      if (uid) {
        const ids = await getRsvpedEventIds(uid);
        setRsvpedEvents(new Set(ids));
        const { count } = await supabase
          .from('app_admins')
          .select('user_id', { count: 'exact', head: true })
          .eq('user_id', uid);
        setIsAdmin(!!count && count > 0);
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
              onRsvp={async () => {
                if (!userId) {
                  setRsvpMessage('Please sign in to RSVP');
                  return;
                }
                const success = await saveRsvp(userId, event.id);
                if (success) {
                  setRsvpMessage(`RSVPed for "${event.title}"`);
                  setRsvpedEvents(prev => new Set(prev).add(event.id));
                } else {
                  setRsvpMessage('Failed to RSVP. Please try again.');
                }
              }}
              onCancelRsvp={async () => {
                if (!userId) {
                  setRsvpMessage('Please sign in first');
                  return;
                }
                const ok = await deleteRsvp(userId, event.id);
                if (ok) {
                  setRsvpedEvents(prev => {
                    const n = new Set(prev);
                    n.delete(event.id);
                    return n;
                  });
                  setRsvpMessage(`Canceled RSVP for "${event.title}"`);
                } else {
                  setRsvpMessage('Failed to cancel RSVP');
                }
              }}
            />
          ))}
        </ul>
      )}

      {/* Messages */}
      {rsvpMessage && (
        <Alert
          variant={rsvpMessage.includes('RSVPed') ? 'success' : rsvpMessage.includes('Failed') || rsvpMessage.includes('Canceled') ? 'error' : 'info'}
          onClose={() => setRsvpMessage(null)}
        >
          {rsvpMessage}
        </Alert>
      )}
    </div>
  );
}
