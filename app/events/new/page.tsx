"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/lib/events';

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Add New Event</h2>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          const success = await createEvent({
            title: title.trim(),
            description: description.trim() || null,
            event_datetime: dateTime,
            location: location.trim() || null,
          });
          setSaving(false);
          if (success) {
            setMessage('✅ Event created successfully!');
            setTimeout(() => router.push('/events'), 1000);
          } else {
            setMessage('❌ Failed to create event. Check console for errors.');
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
          {saving ? 'Saving...' : 'Create Event'}
        </button>
        {message && <p className="mt-2">{message}</p>}
      </form>
    </div>
  );
}
