"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, MapPin, FileText, Repeat } from 'lucide-react';
import { updateEvent, getEventById, deleteEvent } from '@/lib/events';
import { deleteSeries } from '@/lib/events';
import { describeRecurrence } from '@/lib/recurrence';
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
  const [notes, setNotes] = useState('');
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
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
        setDateTime(event.event_datetime ? event.event_datetime.substring(0, 16) : '');
        setLocation(event.location || '');
        setNotes(event.notes || '');
        setAgenda(event.agenda || []);
        setSeriesId(event.series_id || null);
        setRecurrenceRule(event.recurrence_rule || null);
      }
      setLoading(false);
    })();
  }, [eventId]);

  if (!eventId) {
    return <Alert variant="error">Error: No event ID provided.</Alert>;
  }
  if (loading) return <LoadingSpinner text="Loading event..." className="mt-8" />;

  const recurrenceLabel = describeRecurrence(recurrenceRule);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-display-md font-display font-bold text-foreground">
          Edit Event
        </h1>
        {seriesId && recurrenceLabel && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-primary-subtle text-primary rounded-lg text-sm">
            <Repeat className="w-3.5 h-3.5" />
            Part of a recurring series · {recurrenceLabel}
          </div>
        )}
      </div>

      <form
        className="space-y-6"
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
            notes: notes.trim() || null,
            ...(cleanedAgenda.length ? { agenda: cleanedAgenda } : {}),
          });
          setSaving(false);
          if (success) {
            setMessage('Event updated');
            setTimeout(() => router.push('/events'), 800);
          } else {
            setMessage('Failed to update event.');
          }
        }}
      >
        <div className="card p-6 space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <FileText className="w-4 h-4 text-foreground-subtle" />
              Title
            </label>
            <FormInput
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <FormTextarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 text-foreground-subtle" />
                Date &amp; time
              </label>
              <FormInput
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <MapPin className="w-4 h-4 text-foreground-subtle" />
                Location
              </label>
              <FormInput
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <AgendaEditor
            value={agenda}
            onChange={setAgenda}
            meetingContext={{ title, description, startTime: dateTime }}
          />
        </div>

        <div className="card p-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Post-meeting notes (optional)
          </label>
          <FormTextarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Recap, decisions, action items… (markdown supported)"
          />
          <p className="mt-2 text-xs text-foreground-subtle">
            Add notes after the meeting; they'll show on the event page and feed into recap posts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/events/${eventId}`)}
          >
            Cancel
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                if (!confirm('Delete this event? This cannot be undone.')) return;
                setSaving(true);
                setMessage(null);
                const success = await deleteEvent(eventId as string);
                setSaving(false);
                if (success) {
                  setMessage('Event deleted');
                  setTimeout(() => router.push('/events'), 800);
                } else {
                  setMessage('Failed to delete event.');
                }
              }}
            >
              Delete this event
            </Button>
            {seriesId && (
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  if (!confirm('Delete the entire recurring series? All future instances will be removed.')) return;
                  setSaving(true);
                  setMessage(null);
                  const success = await deleteSeries(seriesId);
                  setSaving(false);
                  if (success) {
                    setMessage('Series deleted');
                    setTimeout(() => router.push('/events'), 800);
                  } else {
                    setMessage('Failed to delete series.');
                  }
                }}
              >
                Delete entire series
              </Button>
            )}
          </div>
        </div>

        {message && (
          <Alert
            variant={message.toLowerCase().includes('failed') ? 'error' : 'success'}
            onClose={() => setMessage(null)}
          >
            {message}
          </Alert>
        )}
      </form>
    </div>
  );
}
