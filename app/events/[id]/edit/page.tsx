"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { updateEvent, getEventById, deleteEvent } from '@/lib/events';
import AgendaEditor from '@/components/AgendaEditor';
import type { AgendaItem } from '@/types/supabase';
import { Button, FormInput, FormTextarea, Alert, LoadingSpinner } from '@/components/ui';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
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
        setAgenda(event.agenda || []);
      }
      setLoading(false);
    })();
  }, [eventId]);

  if (!eventId) {
    return (
      <Alert variant="error">
        Error: No event ID provided.
      </Alert>
    );
  }
  if (loading) return <LoadingSpinner text="Loading event..." className="mt-8" />;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Edit Event</h2>
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

          const success = await updateEvent(eventId as string, {
            title: title.trim(),
            description: description.trim() || null,
            event_datetime: dateTime,
            location: location.trim() || null,
            ...(cleanedAgenda.length ? { agenda: cleanedAgenda } : {}),
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
        <div className="mb-3">
          <AgendaEditor value={agenda} onChange={setAgenda} />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            {saving ? 'Updating...' : 'Update Event'}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!confirm('Delete this event?')) return;
              setSaving(true);
              setMessage(null);
              const success = await deleteEvent(eventId as string);
              setSaving(false);
              if (success) {
                setMessage('✅ Event deleted successfully!');
                setTimeout(() => router.push('/events'), 1000);
              } else {
                setMessage('❌ Failed to delete event.');
              }
            }}
          >
            Delete Event
          </Button>
        </div>
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
