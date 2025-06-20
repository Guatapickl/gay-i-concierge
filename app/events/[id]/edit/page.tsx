"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { updateEvent, getEventById } from '@/lib/events';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const event = await getEventById(eventId as string);
      if (event) {
        setTitle(event.title || '');
        setDescription(event.description || '');
        setDateTime(event.event_datetime ? event.event_datetime.substring(0,16) : '');
        setLocation(event.location || '');
      }
      setLoading(false);
    })();
  }, [eventId]);

  if (!eventId) return <div>Error: No event ID provided.</div>;
  if (loading) return <div>Loading event...</div>;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Edit Event</h2>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          const success = await updateEvent(eventId as string, {
            title: title.trim(),
            description: description.trim() || null,
            event_datetime: dateTime,
            location: location.trim() || null,
          });
          setSaving(false);
          if (success) {
            setMessage('✅ Event updated successfully!');
            setTimeout(() => router.push('/events'), 1000);
          } else {
            setMessage('❌ Failed to update event.');
          }
        }}
      >
        <div className="mb-3">
          <label className="block font-medium mb-1">Title</label>
          <input
            type="text"
            className="w-full border px-3 py-2"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Description</label>
          <textarea
            className="w-full border px-3 py-2"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Date &amp; Time</label>
          <input
            type="datetime-local"
            className="w-full border px-3 py-2"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Location</label>
          <input
            type="text"
            className="w-full border px-3 py-2"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={saving}
        >
          {saving ? 'Updating...' : 'Update Event'}
        </button>
        {message && <p className="mt-2">{message}</p>}
      </form>
    </div>
  );
}
