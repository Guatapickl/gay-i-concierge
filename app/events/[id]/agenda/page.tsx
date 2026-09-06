"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventById } from '@/lib/events';
import type { Event } from '@/types/supabase';

export default function EventAgendaPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string | undefined);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const e = await getEventById(eventId);
      setEvent(e);
      setLoading(false);
    })();
  }, [eventId]);

  if (!eventId) return <div>Missing event ID.</div>;
  if (loading) return <div>Loading agenda…</div>;
  if (!event) return <div>Event not found.</div>;

  const agenda = event.agenda || [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button className="text-sm underline" onClick={() => router.back()}>&larr; Back</button>
      <h1 className="page-heading">{event.title} — Agenda</h1>
      {agenda.length === 0 ? (
        <p className="text-foreground-muted">No agenda available for this event.</p>
      ) : (
        <ul className="space-y-3">
          {agenda.map((item, idx) => (
            <li key={idx} className="card p-5">
              <div className="flex flex-wrap items-baseline gap-2">
                {item?.time && <span className="font-mono text-sm text-foreground-muted">{item.time}</span>}
                <span className="font-medium">{item?.title}</span>
                {item?.speaker && <span className="text-sm text-foreground-muted">• {item.speaker}</span>}
              </div>
              {item?.notes && <p className="text-sm text-foreground-muted mt-1 whitespace-pre-line">{item.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
