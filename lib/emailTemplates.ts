/**
 * HTML/text email templates for Gay I Club. Keep inline styles only — many
 * email clients strip <style> blocks. Build via these helpers, then enqueue
 * into `email_reminders`.
 */

import type { Event } from '@/types/supabase';
import { describeRecurrence } from './recurrence';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gayiclub.com';

const PALETTE = {
  bg: '#0a0a0a',
  card: '#141414',
  border: '#262626',
  text: '#ededed',
  muted: '#a3a3a3',
  primary: '#ff6b9d',
  primaryText: '#0a0a0a',
};

function shell(opts: { title: string; preheader: string; body: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PALETTE.text};">
<div style="display:none;max-height:0;overflow:hidden;color:${PALETTE.bg};">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.bg};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${PALETTE.card};border:1px solid ${PALETTE.border};border-radius:12px;overflow:hidden;">
<tr><td style="padding:24px 28px;border-bottom:1px solid ${PALETTE.border};">
<a href="${SITE_URL}" style="text-decoration:none;color:${PALETTE.text};font-weight:700;font-size:18px;letter-spacing:-0.01em;">Gay I Club</a>
</td></tr>
<tr><td style="padding:28px;">
${opts.body}
</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid ${PALETTE.border};color:${PALETTE.muted};font-size:12px;">
You're receiving this because you opted in to club emails.<br>
<a href="${SITE_URL}/alerts/unsubscribe" style="color:${PALETTE.muted};">Unsubscribe</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:${PALETTE.primary};color:${PALETTE.primaryText};padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(label)}</a>`;
}

export function eventReminderEmail(event: Event, hoursUntil: number) {
  const when = new Date(event.event_datetime).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const recurrenceLabel = describeRecurrence(event.recurrence_rule);
  const subject =
    hoursUntil >= 24
      ? `Tomorrow: ${event.title}`
      : `Starting soon: ${event.title}`;
  const preheader =
    hoursUntil >= 24
      ? `${event.title} on ${when}`
      : `${event.title} starts in about ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}`;

  const agendaHtml =
    Array.isArray(event.agenda) && event.agenda.length > 0
      ? `<h3 style="margin:24px 0 8px;font-size:16px;color:${PALETTE.text};">Agenda</h3>
<ul style="padding-left:18px;color:${PALETTE.muted};margin:0;">
${event.agenda
  .map(
    item =>
      `<li style="margin-bottom:6px;"><strong style="color:${PALETTE.text};">${escapeHtml(item.title)}</strong>${item.time ? ` <span style="color:${PALETTE.muted};">· ${escapeHtml(item.time)}</span>` : ''}${item.speaker ? ` <em style="color:${PALETTE.muted};">— ${escapeHtml(item.speaker)}</em>` : ''}</li>`
  )
  .join('')}
</ul>`
      : '';

  const body = `
<h2 style="margin:0 0 8px;font-size:22px;color:${PALETTE.text};">${escapeHtml(event.title)}</h2>
<p style="margin:0 0 4px;color:${PALETTE.muted};">${escapeHtml(when)}</p>
${event.location ? `<p style="margin:0 0 4px;color:${PALETTE.muted};">📍 ${escapeHtml(event.location)}</p>` : ''}
${recurrenceLabel ? `<p style="margin:0 0 16px;color:${PALETTE.muted};">🔁 ${escapeHtml(recurrenceLabel)}</p>` : ''}
${event.description ? `<p style="margin:16px 0;line-height:1.55;">${escapeHtml(event.description)}</p>` : ''}
${agendaHtml}
<div style="margin:28px 0 0;">
${button('View event', `${SITE_URL}/events/${event.id}`)}
</div>`;

  const text = `${event.title}
${when}${event.location ? `\nLocation: ${event.location}` : ''}${recurrenceLabel ? `\nRepeats: ${recurrenceLabel}` : ''}

${event.description || ''}

View event: ${SITE_URL}/events/${event.id}`;

  return { subject, html: shell({ title: subject, preheader, body }), text };
}

export function rsvpConfirmationEmail(event: Event) {
  const when = new Date(event.event_datetime).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const subject = `You're in: ${event.title}`;
  const preheader = `RSVP confirmed for ${event.title} on ${when}`;
  const body = `
<h2 style="margin:0 0 8px;font-size:22px;color:${PALETTE.text};">You're on the list</h2>
<p style="margin:0 0 16px;color:${PALETTE.muted};">Thanks for RSVPing — see you on ${escapeHtml(when)}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PALETTE.bg};border:1px solid ${PALETTE.border};border-radius:8px;margin:16px 0;">
<tr><td style="padding:16px;">
<strong style="color:${PALETTE.text};">${escapeHtml(event.title)}</strong><br>
<span style="color:${PALETTE.muted};">${escapeHtml(when)}</span>
${event.location ? `<br><span style="color:${PALETTE.muted};">📍 ${escapeHtml(event.location)}</span>` : ''}
</td></tr>
</table>
<div style="margin:8px 0 0;">
${button('View details', `${SITE_URL}/events/${event.id}`)}
</div>
<p style="margin:24px 0 0;color:${PALETTE.muted};font-size:13px;">We'll send a reminder the day before and a heads-up an hour before the meeting starts.</p>`;

  const text = `You're on the list for ${event.title}
${when}${event.location ? `\nLocation: ${event.location}` : ''}

We'll send a reminder before the meeting.

View details: ${SITE_URL}/events/${event.id}`;

  return { subject, html: shell({ title: subject, preheader, body }), text };
}

export function weeklyDigestEmail(events: Event[], postCount: number) {
  const subject = `This week at Gay I Club`;
  const preheader = `${events.length} upcoming meeting${events.length === 1 ? '' : 's'}, ${postCount} new feed post${postCount === 1 ? '' : 's'}`;
  const eventList =
    events.length === 0
      ? `<p style="color:${PALETTE.muted};">No meetings scheduled — propose one in the feed!</p>`
      : `<ul style="padding-left:18px;color:${PALETTE.muted};margin:0;">
${events
  .map(e => {
    const when = new Date(e.event_datetime).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    return `<li style="margin-bottom:8px;"><a href="${SITE_URL}/events/${e.id}" style="color:${PALETTE.text};font-weight:600;text-decoration:none;">${escapeHtml(e.title)}</a><br><span style="color:${PALETTE.muted};">${escapeHtml(when)}${e.location ? ` · ${escapeHtml(e.location)}` : ''}</span></li>`;
  })
  .join('')}
</ul>`;

  const body = `
<h2 style="margin:0 0 16px;font-size:22px;color:${PALETTE.text};">Your week at the club</h2>
<h3 style="margin:0 0 12px;font-size:16px;color:${PALETTE.text};">Upcoming meetings</h3>
${eventList}
<div style="margin:28px 0 0;">
${button('Open the hub', `${SITE_URL}/hub`)}
</div>`;

  const text = `Your week at Gay I Club

${events.map(e => `- ${e.title} (${new Date(e.event_datetime).toLocaleString()})`).join('\n') || 'No meetings scheduled.'}

Open the hub: ${SITE_URL}/hub`;

  return { subject, html: shell({ title: subject, preheader, body }), text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
