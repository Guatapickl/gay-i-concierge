import { supabase } from './supabase';
import { Event } from '@/types/supabase';

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
}): Promise<boolean> {
  const { error } = await supabase.from('events').insert([
    {
      title: newEvent.title,
      description: newEvent.description ?? null,
      event_datetime: newEvent.event_datetime,
      location: newEvent.location ?? null,
    },
  ]);
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
