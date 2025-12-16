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
      // Filter to only show future events
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
      <Alert variant="info">
        Please sign in to view your RSVPs.
      </Alert>
    );
  }
  if (loading) return <LoadingSpinner text="Loading your RSVPs..." className="mt-8" />;
  if (!events.length) {
    return (
      <div className="text-sm text-gray-400 italic">
        You have no RSVPs yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My RSVPs</h2>
      </div>
      <ul className="space-y-4">
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
                setMessage(`Canceled RSVP for "${event.title}".`);
              } else {
                setMessage('Failed to cancel RSVP.');
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
