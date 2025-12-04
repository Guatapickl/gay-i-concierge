"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
        // Minimal admin check: exists in app_admins
        const { count } = await supabase
          .from('app_admins')
          .select('user_id', { count: 'exact', head: true })
          .eq('user_id', uid);
        setIsAdmin(!!count && count > 0);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner text="Loading events..." className="mt-8" />;
  // Always render the page shell so the Add button is visible even when empty

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
        {isAdmin && (
          <Link href="/events/new">
            <Button variant="success" size="md">+ Add New Event</Button>
          </Link>
        )}
      </div>
      {events.length === 0 ? (
        <div className="text-sm text-gray-400 italic">No upcoming events.</div>
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
                  setRsvpMessage('Please sign in before RSVPing.');
                  return;
                }
                const success = await saveRsvp(userId, event.id);
                if (success) {
                  setRsvpMessage(`✅ You have RSVPed for "${event.title}"!`);
                  setRsvpedEvents(prev => new Set(prev).add(event.id));
                } else {
                  setRsvpMessage('❌ Failed to RSVP. Please try again.');
                }
              }}
              onCancelRsvp={async () => {
                if (!userId) {
                  setRsvpMessage('Please sign in first.');
                  return;
                }
                const ok = await deleteRsvp(userId, event.id);
                if (ok) {
                  setRsvpedEvents(prev => {
                    const n = new Set(prev);
                    n.delete(event.id);
                    return n;
                  });
                  setRsvpMessage(`You canceled your RSVP for "${event.title}".`);
                } else {
                  setRsvpMessage('Failed to cancel RSVP.');
                }
              }}
            />
          ))}
        </ul>
      )}
      {rsvpMessage && (
        <Alert
          variant={rsvpMessage.includes('✅') ? 'success' : rsvpMessage.includes('❌') || rsvpMessage.includes('Failed') || rsvpMessage.includes('canceled') ? 'error' : 'info'}
          onClose={() => setRsvpMessage(null)}
        >
          {rsvpMessage}
        </Alert>
      )}

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-900 rounded border border-gray-700 text-xs font-mono text-gray-400">
        <p className="font-bold text-gray-300 mb-2">Debug Info (Temporary)</p>
        <p>User ID: {userId || 'Not logged in'}</p>
        <p>Is Admin: {isAdmin ? 'YES' : 'NO'}</p>
        <p>
          To fix admin status, run this SQL:<br />
          <code className="block mt-1 p-2 bg-black rounded select-all">
            INSERT INTO app_admins (user_id) VALUES (&apos;{userId || 'YOUR_USER_ID'}&apos;);
          </code>
        </p>
      </div>
    </div>
  );
}
