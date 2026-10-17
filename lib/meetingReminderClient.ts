/**
 * Browser-side client for POST /api/events/remind (organizer meeting
 * reminders). Mirrors the error shape of `getNextMeetingRsvps` so the panel
 * can tell "not allowed" apart from "nothing to send".
 */
import { authHeader } from './firebase/authClient';

export type MeetingReminderResponse = {
  ok: true;
  dry_run: boolean;
  batch_id: string | null;
  queued: number;
  subject: string;
  event: { id: string; title: string; event_datetime: string; location: string | null };
  recipient_count: number;
  recipients: { user_id: string; rsvp_status: 'yes' | 'maybe' | 'no' | null }[];
  unsubscribed: number;
  already_reminded: number;
  unreachable: number;
  accounts: number;
  delivery: { attempted: number; sent: number; failed: number } | null;
  generated_at: string;
};

export class MeetingReminderClientError extends Error {
  constructor(message: string, public readonly status: number | null) {
    super(message);
    this.name = 'MeetingReminderClientError';
  }
}

export type MeetingReminderRequest = {
  eventId?: string | null;
  note?: string;
  dryRun?: boolean;
  resend?: boolean;
};

export async function requestMeetingReminder(args: MeetingReminderRequest): Promise<MeetingReminderResponse> {
  const headers = await authHeader();
  if (!headers.Authorization) throw new MeetingReminderClientError('Sign in to send reminders.', 401);
  let res: Response;
  try {
    res = await fetch('/api/events/remind', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        event_id: args.eventId ?? undefined,
        note: args.note ?? '',
        dry_run: args.dryRun === true,
        resend: args.resend === true,
      }),
    });
  } catch (err) {
    throw new MeetingReminderClientError(`Could not reach the server (${(err as Error).message}).`, null);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = String((await res.json())?.error ?? '');
    } catch {
      /* non-JSON error body */
    }
    throw new MeetingReminderClientError(detail || `Request failed (HTTP ${res.status}).`, res.status);
  }
  return (await res.json()) as MeetingReminderResponse;
}
