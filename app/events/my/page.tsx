"use client";

import { useEffect, useState } from 'react';
import { getEventsByIds } from '@/lib/events';
import { getRsvpedEventIds, deleteRsvp } from '@/lib/rsvp';
import type { Event } from '@/types/supabase';
import { downloadICS, googleCalendarUrl } from '@/lib/calendar';

export default function MyRsvpsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const pid = localStorage.getItem('profile_id');
      setProfileId(pid);
      if (!pid) {
        setLoading(false);
        return;
      }
      const ids = await getRsvpedEventIds(pid);
      const data = await getEventsByIds(ids);
      setEvents(data);
      setLoading(false);
    })();
  }, []);

  if (!profileId) {
    return <div>Please complete onboarding to view your RSVPs.</div>;
  }
  if (loading) return <div>Loading your RSVPs...</div>;
  if (!events.length) return <div><em>You have no RSVPs yet.</em></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My RSVPs</h2>
      </div>
      <ul className="space-y-4">
        {events.map((event) => (
          <li key={event.id} className="border p-4 rounded">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <p><strong>Date:</strong> {new Date(event.event_datetime).toLocaleString()}</p>
            {event.location && <p><strong>Location:</strong> {event.location}</p>}
            {event.description && <p>{event.description}</p>}
            <div className="mt-2 flex gap-3 items-center">
              <button
                className="px-3 py-1 bg-gray-200 rounded text-sm"
                onClick={() => downloadICS(event)}
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
              <button
                className="ml-auto px-3 py-1 bg-red-600 text-white rounded text-sm"
                onClick={async () => {
                  if (!profileId) return;
                  const ok = await deleteRsvp(profileId, event.id);
                  if (ok) {
                    setEvents(prev => prev.filter(e => e.id !== event.id));
                    setMessage(`Canceled RSVP for "${event.title}".`);
                  } else {
                    setMessage('Failed to cancel RSVP.');
                  }
                }}
              >
                Cancel RSVP
              </button>
            </div>
          </li>
        ))}
      </ul>
      {message && <div className="mt-4 text-center">{message}</div>}
    </div>
  );
}

