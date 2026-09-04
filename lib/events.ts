import { addDoc, deleteDoc, doc, getDocs, limit as qLimit, orderBy, query, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase/client';
import { chunk, col, getRow, listRows, nowIso, payloadOf, ref, rowOf } from './firebase/db';
import { Event, AgendaItem, RecurrenceConfig } from '@/types/supabase';
import { buildSeriesRows } from './recurrence';

const byDate = (a: Event, b: Event) =>
  new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime();

// Fetch upcoming events sorted by date
export async function getUpcomingEvents(): Promise<Event[]> {
  try {
    return await listRows<Event>(
      'events',
      where('event_datetime', '>=', Timestamp.now()),
      orderBy('event_datetime', 'asc'),
    );
  } catch (err) {
    console.error('Error fetching events:', (err as Error).message);
    return [];
  }
}

// Insert a new event
export async function createEvent(newEvent: {
  title: string;
  description?: string | null;
  event_datetime: string;
  location?: string | null;
  agenda?: AgendaItem[] | null;
}): Promise<boolean> {
  const row: Partial<Event> = {
    title: newEvent.title,
    description: newEvent.description ?? null,
    event_datetime: newEvent.event_datetime,
    location: newEvent.location ?? null,
    created_at: nowIso(),
  };
  if (typeof newEvent.agenda !== 'undefined') {
    row.agenda = newEvent.agenda;
  }
  try {
    await addDoc(col('events'), payloadOf(row));
    return true;
  } catch (err) {
    console.error('Failed to insert event:', (err as Error).message);
    return false;
  }
}

// Update an existing event by ID
export async function updateEvent(
  eventId: string,
  updates: Partial<Event>
): Promise<boolean> {
  try {
    await updateDoc(ref('events', eventId), payloadOf({ ...updates, updated_at: nowIso() }));
    return true;
  } catch (err) {
    console.error('Failed to update event:', (err as Error).message);
    return false;
  }
}

// Get a single event by its ID
export async function getEventById(id: string): Promise<Event | null> {
  try {
    return await getRow<Event>('events', id);
  } catch (err) {
    console.error('Error fetching event:', (err as Error).message);
    return null;
  }
}

// Delete an event by ID
export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    await deleteDoc(ref('events', eventId));
    return true;
  } catch (err) {
    console.error('Failed to delete event:', (err as Error).message);
    return false;
  }
}

// Delete every event sharing a series_id
export async function deleteSeries(seriesId: string): Promise<boolean> {
  try {
    const snap = await getDocs(query(col('events'), where('series_id', '==', seriesId)));
    for (const docs of chunk(snap.docs, 400)) {
      const batch = writeBatch(db);
      docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error('Failed to delete series:', (err as Error).message);
    return false;
  }
}

// Fetch the next N upcoming events sharing a series_id (for "Series" view)
export async function getUpcomingSeriesEvents(seriesId: string, limit = 12): Promise<Event[]> {
  try {
    return await listRows<Event>(
      'events',
      where('series_id', '==', seriesId),
      where('event_datetime', '>=', Timestamp.now()),
      orderBy('event_datetime', 'asc'),
      qLimit(limit),
    );
  } catch (err) {
    console.error('Error fetching series events:', (err as Error).message);
    return [];
  }
}

/**
 * Create a one-off event or a recurring series in a single call. Returns the
 * inserted rows (one for non-recurring, N for series) or null on error.
 */
export async function createRecurringSeries(args: {
  title: string;
  description: string | null;
  baseDateTime: string;
  location: string | null;
  agenda?: AgendaItem[] | null;
  recurrence: RecurrenceConfig;
}): Promise<Event[] | null> {
  const rows = buildSeriesRows(args);
  try {
    const created_at = nowIso();
    const batch = writeBatch(db);
    const out: Event[] = rows.map(r => {
      const d = doc(col('events'));
      const row = { ...r, created_at };
      batch.set(d, payloadOf(row));
      return { id: d.id, ...row } as Event;
    });
    await batch.commit();
    return out;
  } catch (err) {
    console.error('Failed to create recurring series:', (err as Error).message);
    return null;
  }
}

// Fetch events by array of IDs (helper for "My RSVPs")
export async function getEventsByIds(ids: string[]): Promise<Event[]> {
  if (!ids.length) return [];
  try {
    const out: Event[] = [];
    for (const part of chunk(Array.from(new Set(ids)))) {
      const snap = await getDocs(query(col('events'), where('__name__', 'in', part)));
      snap.docs.forEach(d => out.push(rowOf<Event>(d)));
    }
    return out.sort(byDate);
  } catch (err) {
    console.error('Error fetching events by IDs:', (err as Error).message);
    return [];
  }
}
