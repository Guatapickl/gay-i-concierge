"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Event } from '@/types/supabase';
import { getEventById } from '@/lib/events';
import { getRsvpedEventIds, saveRsvp, deleteRsvp } from '@/lib/rsvp';
import { downloadICS, googleCalendarUrl } from '@/lib/calendar';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isRsvped, setIsRsvped] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const e = await getEventById(eventId);
      setEvent(e);
      const pid = localStorage.getItem('profile_id');
      setProfileId(pid);
      if (pid) {
        const ids = await getRsvpedEventIds(pid);
        setIsRsvped(ids.includes(eventId));
      }
      setLoading(false);
    })();
  }, [eventId]);

  if (!eventId) return <div>Missing event ID.</div>;
  if (loading) return <div>Loading event…</div>;
  if (!event) return <div>Event not found.</div>;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button className="text-sm underline" onClick={() => router.back()}>&larr; Back</button>
      <h1 className="text-3xl font-bold">{event.title}</h1>
      <p><strong>Date:</strong> {new Date(event.event_datetime).toLocaleString()}</p>
      {event.location && <p><strong>Location:</strong> {event.location}</p>}
      {event.description && <p className="whitespace-pre-line">{event.description}</p>}

      <div className="flex flex-wrap gap-3 items-center">
        {isRsvped ? (
          <>
            <span className="text-green-700 font-semibold">✅ RSVPed</span>
            <button
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={async () => {
                if (!profileId) { setMessage('Please complete onboarding first.'); return; }
                const ok = await deleteRsvp(profileId, event.id);
                if (ok) { setIsRsvped(false); setMessage('Canceled RSVP.'); }
                else { setMessage('Failed to cancel RSVP.'); }
              }}
            >
              Cancel RSVP
            </button>
          </>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={async () => {
              if (!profileId) { setMessage('Please complete onboarding before RSVPing.'); return; }
              const ok = await saveRsvp(profileId, event.id);
              if (ok) { setIsRsvped(true); setMessage('✅ You RSVPed to this event.'); }
              else { setMessage('❌ Failed to RSVP.'); }
            }}
          >
            RSVP
          </button>
        )}

        <button className="px-3 py-1 bg-gray-200 rounded text-sm" onClick={() => downloadICS(event)}>
          Add to Calendar (.ics)
        </button>
        <a className="px-3 py-1 bg-gray-200 rounded text-sm" href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
          Add to Google Calendar
        </a>

        <button
          className="ml-auto px-3 py-1 bg-gray-200 rounded text-sm"
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({ title: event.title, text: event.description || 'Check out this event!', url: shareUrl });
              } else {
                await navigator.clipboard.writeText(shareUrl);
                setMessage('Link copied to clipboard');
              }
            } catch {
              // ignore
            }
          }}
        >
          Share
        </button>
      </div>
      {message && <div className="text-center">{message}</div>}
    </div>
  );
}

