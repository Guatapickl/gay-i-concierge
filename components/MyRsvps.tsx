"use client";

import { useEffect, useState } from 'react';
import { getEventsByIds } from '@/lib/events';
import { getRsvpedEventIds, deleteRsvp } from '@/lib/rsvp';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types/supabase';
import { Alert, LoadingSpinner } from '@/components/ui';
import EventListItem from '@/components/EventListItem';

export default function MyRsvps() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const ids = await getRsvpedEventIds(uid);
      const data = await getEventsByIds(ids);
      const now = new Date();
      const futureEvents = data
        .filter(event => new Date(event.event_datetime) >= now)
        .sort((a, b) => new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime());
      setEvents(futureEvents);
      setLoading(false);
    })();
  }, []);

  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground-muted">Sign in to view your RSVPs</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading your RSVPs..." className="py-8" />;
  }

  if (!events.length) {
    return (
      <div className="text-center py-8">
        <p className="text-foreground-muted">No upcoming events</p>
        <p className="text-sm text-foreground-subtle mt-1">
          Browse events to find something interesting
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {events.map((event) => (
          <EventListItem
            key={event.id}
            event={event}
            isRsvped={true}
            showViewAgenda={false}
            onCancelRsvp={async () => {
              if (!userId) return;
              const ok = await deleteRsvp(userId, event.id);
              if (ok) {
                setEvents(prev => prev.filter(e => e.id !== event.id));
                setMessage(`Canceled RSVP for "${event.title}"`);
              } else {
                setMessage('Failed to cancel RSVP');
              }
            }}
          />
        ))}
      </ul>
      {message && (
        <Alert
          variant={message.includes('Canceled') ? 'success' : 'error'}
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}
    </div>
  );
}
