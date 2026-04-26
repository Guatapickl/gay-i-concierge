"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, FileText } from 'lucide-react';
import { createEvent, createRecurringSeries } from '@/lib/events';
import AgendaEditor from '@/components/AgendaEditor';
import RecurrencePicker from '@/components/RecurrencePicker';
import type { AgendaItem, RecurrenceConfig } from '@/types/supabase';
import { Button, FormInput, FormTextarea, Alert } from '@/components/ui';

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
    frequency: 'none',
    count: 8,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cleanedAgenda = (): AgendaItem[] =>
    agenda
      .map(i => ({
        time: (i.time || '').trim() || null,
        title: (i.title || '').trim(),
        speaker: (i.speaker || '').trim() || null,
        notes: (i.notes || '').trim() || null,
      }))
      .filter(i => i.title);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-display-md font-display font-bold text-foreground">
          New Event
        </h1>
        <p className="text-foreground-muted mt-1">
          Schedule a one-off meeting or a recurring series
        </p>
      </div>

      <form
        className="space-y-6"
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          const finalAgenda = cleanedAgenda();
          const agendaArg = finalAgenda.length ? finalAgenda : undefined;

          if (recurrence.frequency === 'none') {
            const success = await createEvent({
              title: title.trim(),
              description: description.trim() || null,
              event_datetime: dateTime,
              location: location.trim() || null,
              agenda: agendaArg,
            });
            setSaving(false);
            if (success) {
              setMessage('Event created');
              setTimeout(() => router.push('/events'), 800);
            } else {
              setMessage('Failed to create event. Check console for errors.');
            }
            return;
          }

          const rows = await createRecurringSeries({
            title: title.trim(),
            description: description.trim() || null,
            baseDateTime: dateTime,
            location: location.trim() || null,
            agenda: agendaArg ?? null,
            recurrence,
          });
          setSaving(false);
          if (rows) {
            setMessage(`Created series of ${rows.length} meetings`);
            setTimeout(() => router.push('/events'), 800);
          } else {
            setMessage('Failed to create recurring series. Check console for errors.');
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
              placeholder="e.g. October Meetup: Agentic Workflows"
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
              placeholder="What will attendees learn or discuss?"
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
                placeholder="In-person address or video link"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <RecurrencePicker
            value={recurrence}
            onChange={setRecurrence}
            baseDateTime={dateTime}
          />
        </div>

        <div className="card p-6">
          <AgendaEditor
            value={agenda}
            onChange={setAgenda}
            meetingContext={{ title, description, startTime: dateTime }}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving
              ? 'Saving…'
              : recurrence.frequency === 'none'
                ? 'Create event'
                : `Create series of ${recurrence.count}`}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/events')}
          >
            Cancel
          </Button>
        </div>

        {message && (
          <Alert
            variant={message.includes('Failed') ? 'error' : 'success'}
            onClose={() => setMessage(null)}
          >
            {message}
          </Alert>
        )}
      </form>
    </div>
  );
}
