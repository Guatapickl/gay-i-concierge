import { supabase } from './supabase';
import { Event, AgendaItem, RecurrenceConfig } from '@/types/supabase';
import { buildSeriesRows } from './recurrence';

// Fetch upcoming events sorted by date
export async function getUpcomingEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_datetime', new Date().toISOString())
    .order('event_datetime', { ascending: true });
  if (error) {
    console.error('Error fetching events:', error.message);
    return [];
  }
  return data || [];
}

// Insert a new event
export async function createEvent(newEvent: {
  title: string;
  description?: string | null;
  event_datetime: string;
  location?: string | null;
  agenda?: AgendaItem[] | null;
}): Promise<boolean> {
  // Build row object conditionally to avoid errors if DB column doesn't exist yet
  const row: Partial<Event> = {
    title: newEvent.title,
    description: newEvent.description ?? null,
    event_datetime: newEvent.event_datetime,
    location: newEvent.location ?? null,
  };
  if (typeof newEvent.agenda !== 'undefined') {
    row.agenda = newEvent.agenda; // requires events.agenda jsonb column in DB
  }
  const { error } = await supabase.from('events').insert([row]);
  if (error) {
    console.error('Failed to insert event:', error.message);
    return false;
  }
  return true;
}

// Update an existing event by ID
export async function updateEvent(
  eventId: string,
  updates: Partial<Event>
): Promise<boolean> {
  const { error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId);
  if (error) {
    console.error('Failed to update event:', error.message);
    return false;
  }
  return true;
}

// Get a single event by its ID
export async function getEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching event:', error.message);
    return null;
  }
  return data as Event;
}

// Delete an event by ID
export async function deleteEvent(eventId: string): Promise<boolean> {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) {
    console.error('Failed to delete event:', error.message);
    return false;
  }
  return true;
}

// Delete every event sharing a series_id
export async function deleteSeries(seriesId: string): Promise<boolean> {
  const { error } = await supabase.from('events').delete().eq('series_id', seriesId);
  if (error) {
    console.error('Failed to delete series:', error.message);
    return false;
  }
  return true;
}

// Fetch the next N upcoming events sharing a series_id (for "Series" view)
export async function getUpcomingSeriesEvents(seriesId: string, limit = 12): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('series_id', seriesId)
    .gte('event_datetime', new Date().toISOString())
    .order('event_datetime', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('Error fetching series events:', error.message);
    return [];
  }
  return data || [];
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
  const { data, error } = await supabase.from('events').insert(rows).select();
  if (error) {
    console.error('Failed to create recurring series:', error.message);
    return null;
  }
  return (data || []) as Event[];
}

// Fetch events by array of IDs (helper for "My RSVPs")
export async function getEventsByIds(ids: string[]): Promise<Event[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('id', ids)
    .order('event_datetime', { ascending: true });
  if (error) {
    console.error('Error fetching events by IDs:', error.message);
    return [];
  }
  return (data || []) as Event[];
}
