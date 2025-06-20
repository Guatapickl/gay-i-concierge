"use client";

import { useEffect, useState } from 'react';
import { getUpcomingEvents } from '@/lib/events';
import { saveRsvp } from '@/lib/rsvp';
import type { Event } from '@/types/supabase';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getUpcomingEvents();
      setEvents(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Loading events...</div>;
  if (!loading && events.length === 0) return <div><em>No upcoming events.</em></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
        <a href="/events/new" className="text-white bg-green-600 px-3 py-2 rounded">+ Add New Event</a>
      </div>
      <ul className="space-y-4">
        {events.map(event => (
          <li key={event.id} className="border p-4 rounded">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <p><strong>Date:</strong> {new Date(event.event_datetime).toLocaleString()}</p>
            {event.location && <p><strong>Location:</strong> {event.location}</p>}
            {event.description && <p>{event.description}</p>}
            <div className="mt-2 space-x-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={async () => {
                  const profileId = localStorage.getItem('profile_id');
                  if (!profileId) {
                    setRsvpMessage('Please complete the onboarding chat to create a profile before RSVPing.');
                    return;
                  }
                  const success = await saveRsvp(profileId, event.id);
                  if (success) {
                    setRsvpMessage(`✅ You have RSVPed for "${event.title}"!`);
                  } else {
                    setRsvpMessage('❌ Failed to RSVP. Please try again.');
                  }
                }}
              >
                RSVP
              </button>
              <a href={`/events/${event.id}/edit`} className="text-sm text-blue-600 underline">Edit</a>
            </div>
          </li>
        ))}
      </ul>
      {rsvpMessage && <div className="mt-4 text-center">{rsvpMessage}</div>}
    </div>
  );
}
