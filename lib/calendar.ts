import type { Event } from '@/types/supabase';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatICSDate(date: Date) {
  // Format as UTC in basic format: YYYYMMDDTHHMMSSZ
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function buildICS(event: Event) {
  const start = new Date(event.event_datetime);
  // Default duration 1 hour if no end provided; compute end
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const uid = `${event.id}@gayiclub.com`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gay I Club//Concierge//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : undefined,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : undefined,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean) as string[];
  return lines.join('\r\n');
}

function escapeText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function downloadICS(event: Event) {
  const ics = buildICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(event.title)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(event: Event) {
  const start = new Date(event.event_datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => {
    // Google expects UTC basic format without Z for details link; include Z to be explicit
    return formatICSDate(d).replace('Z', 'Z');
  };
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: event.description || '',
    location: event.location || '',
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9\-_.]+/gi, '_');
}

