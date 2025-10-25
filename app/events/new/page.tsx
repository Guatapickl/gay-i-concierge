"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/lib/events';
import AgendaEditor from '@/components/AgendaEditor';
import type { AgendaItem } from '@/types/supabase';
import { Button, FormInput, FormTextarea, Alert } from '@/components/ui';

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
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
          const cleanedAgenda = agenda
            .map(i => ({
              time: (i.time || '').trim() || null,
              title: (i.title || '').trim(),
              speaker: (i.speaker || '').trim() || null,
              notes: (i.notes || '').trim() || null,
            }))
            .filter(i => i.title);

          const success = await createEvent({
            title: title.trim(),
            description: description.trim() || null,
            event_datetime: dateTime,
            location: location.trim() || null,
            agenda: cleanedAgenda.length ? cleanedAgenda : undefined,
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
          <FormInput
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Description</label>
          <FormTextarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Date &amp; Time</label>
          <FormInput
            type="datetime-local"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Location</label>
          <FormInput
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <AgendaEditor value={agenda} onChange={setAgenda} />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Create Event'}
        </Button>
        {message && (
          <Alert
            variant={message.includes('✅') ? 'success' : 'error'}
            className="mt-4"
            onClose={() => setMessage(null)}
          >
            {message}
          </Alert>
        )}
      </form>
    </div>
  );
}
