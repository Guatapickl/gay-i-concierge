"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUpcomingEvents } from '@/lib/events';
import { saveRsvp, deleteRsvp, getRsvpedEventIds } from '@/lib/rsvp';
import { downloadICS, googleCalendarUrl } from '@/lib/calendar';
import type { Event } from '@/types/supabase';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);
  const [rsvpedEvents, setRsvpedEvents] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getUpcomingEvents();
      setEvents(data);
      setLoading(false);
      const pid = localStorage.getItem('profile_id');
      setProfileId(pid);
      if (pid) {
        const ids = await getRsvpedEventIds(pid);
        setRsvpedEvents(new Set(ids));
      }
    })();
  }, []);

  if (loading) return <div>Loading events...</div>;
  if (!loading && events.length === 0) return <div><em>No upcoming events.</em></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
        <Link href="/events/new" className="text-white bg-green-600 px-3 py-2 rounded">+ Add New Event</Link>
      </div>
      <ul className="space-y-4">
        {events.map(event => (
          <li key={event.id} className="border p-4 rounded">
            <h3 className="text-xl font-semibold">
              <a className="underline" href={`/events/${event.id}`}>{event.title}</a>
            </h3>
            <p><strong>Date:</strong> {new Date(event.event_datetime).toLocaleString()}</p>
            {event.location && <p><strong>Location:</strong> {event.location}</p>}
            {event.description && <p>{event.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {rsvpedEvents.has(event.id) ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-semibold">✅ RSVPed</span>
                  <button
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                    onClick={async () => {
                      if (!profileId) {
                        setRsvpMessage('Please complete onboarding first.');
                        return;
                      }
                      const ok = await deleteRsvp(profileId, event.id);
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
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  onClick={async () => {
                    if (!profileId) {
                      setRsvpMessage('Please complete onboarding to create a profile before RSVPing.');
                      return;
                    }
                    const success = await saveRsvp(profileId, event.id);
                    if (success) {
                      setRsvpMessage(`✅ You have RSVPed for "${event.title}"!`);
                      setRsvpedEvents(prev => new Set(prev).add(event.id));
                    } else {
                      setRsvpMessage('❌ Failed to RSVP. Please try again.');
                    }
                  }}
                >
                  RSVP
                </button>
              )}
              <button
                className="px-3 py-1 bg-gray-200 rounded text-sm"
                onClick={() => downloadICS(event)}
                title="Download .ics"
              >
                Add to Calendar (.ics)
              </button>
              <a
                className="px-3 py-1 bg-gray-200 rounded text-sm"
                href={googleCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to Google Calendar
              </a>
              <a href={`/events/${event.id}/edit`} className="text-sm text-blue-600 underline ml-auto">Edit</a>
            </div>
          </li>
        ))}
      </ul>
      {rsvpMessage && <div className="mt-4 text-center">{rsvpMessage}</div>}
    </div>
  );
}
