"use client";

import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { Alert, Button, FormTextarea } from '@/components/ui';
import { MeetingReminderClientError, requestMeetingReminder, type MeetingReminderResponse } from '@/lib/meetingReminderClient';

/**
 * Organizer control for emailing every member with a club account about one
 * meeting. Loads a preview (who would receive it) first, asks for confirmation
 * with the live count, then sends and reports what the email provider accepted.
 */

type Props = {
  eventId: string;
  eventTitle: string;
};

type PreviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MeetingReminderResponse };

type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; data: MeetingReminderResponse }
  | { status: 'error'; message: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function describeDelivery(data: MeetingReminderResponse): string {
  if (data.queued === 0) return 'Nothing was sent: nobody was due a reminder.';
  const d = data.delivery;
  if (!d) return `${plural(data.queued, 'reminder', 'reminders')} queued. The reminder cron sends queued mail within about 10 minutes.`;
  if (d.failed === 0 && d.sent >= data.queued) return `Sent to ${plural(d.sent, 'member', 'members')}.`;
  const pending = data.queued - d.sent;
  return `Sent to ${plural(d.sent, 'member', 'members')}; ${plural(pending, 'message is', 'messages are')} still queued and will be retried automatically.`;
}

export default function MeetingReminderPanel({ eventId, eventTitle }: Props) {
  const [note, setNote] = useState('');
  const [resend, setResend] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
  const [previewRun, setPreviewRun] = useState(0);
  const [send, setSend] = useState<SendState>({ status: 'idle' });

  // Reload the recipient preview; the effect below reacts to `previewRun`.
  const refreshPreview = useCallback(() => {
    setPreview({ status: 'loading' });
    setPreviewRun(run => run + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    requestMeetingReminder({ eventId, dryRun: true, resend })
      .then(data => {
        if (!cancelled) setPreview({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof MeetingReminderClientError && err.status === 403
          ? 'Only organizers can send reminders.'
          : err instanceof Error ? err.message : String(err);
        setPreview({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, resend, previewRun]);

  const count = preview.status === 'ready' ? preview.data.recipient_count : 0;

  const handleSend = async () => {
    if (preview.status !== 'ready' || count === 0) return;
    const ok = window.confirm(
      `Email ${plural(count, 'member', 'members')} a reminder about "${eventTitle}"?` +
        (note.trim() ? '\n\nYour note will appear at the top of the email.' : '') +
        '\n\nThis cannot be recalled once sent.',
    );
    if (!ok) return;
    setSend({ status: 'sending' });
    try {
      const data = await requestMeetingReminder({ eventId, note, resend });
      setSend({ status: 'sent', data });
      refreshPreview();
    } catch (err) {
      setSend({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <section className="card p-6 space-y-4" aria-labelledby="meeting-reminder-heading" data-testid="meeting-reminder-panel">
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 id="meeting-reminder-heading" className="text-lg font-display font-semibold">Email members a reminder</h2>
          <p className="text-sm text-foreground-muted mt-1">
            Goes to everyone who has signed up at gayiclub.com, with the meeting details, agenda and one-click answers (going, maybe, can&apos;t make it).
            Members who unsubscribed from club email are left out.
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Note to members <span className="text-foreground-muted font-normal">(optional)</span></span>
        <FormTextarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Anything you want to say at the top of the email, like a change of room or what to bring."
          className="mt-1 md:max-w-none lg:max-w-none"
          disabled={send.status === 'sending'}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-foreground-muted">
        <input
          type="checkbox"
          checked={resend}
          onChange={e => {
            setResend(e.target.checked);
            setSend({ status: 'idle' });
            setPreview({ status: 'loading' });
          }}
          disabled={send.status === 'sending'}
          className="accent-primary"
        />
        Include members who already received a reminder for this meeting
      </label>

      <Recipients state={preview} onRetry={refreshPreview} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={() => void handleSend()}
          disabled={preview.status !== 'ready' || count === 0 || send.status === 'sending'}
          data-testid="send-reminder"
        >
          <Send className="w-4 h-4" />
          {send.status === 'sending' ? 'Sending…' : count > 0 ? `Send reminder to ${plural(count, 'member', 'members')}` : 'Send reminder'}
        </Button>
        {preview.status === 'ready' && count === 0 && send.status !== 'sent' && (
          <span className="text-sm text-foreground-muted">
            {preview.data.already_reminded > 0
              ? 'Everyone has already received a reminder for this meeting. Tick the box above to send another.'
              : 'No members to email.'}
          </span>
        )}
      </div>

      {send.status === 'sent' && (
        <Alert variant={send.data.delivery && send.data.delivery.failed > 0 ? 'warning' : 'success'}>
          {describeDelivery(send.data)}
        </Alert>
      )}
      {send.status === 'error' && <Alert variant="error">Couldn&apos;t send the reminder: {send.message}</Alert>}
    </section>
  );
}

function Recipients({ state, onRetry }: { state: PreviewState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return <p className="text-sm text-foreground-muted" data-state="preview-loading">Working out who would receive it…</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-wrap items-center gap-3" data-state="preview-error">
        <Alert variant="error" className="flex-1">Couldn&apos;t load recipients: {state.message}</Alert>
        <Button variant="secondary" size="sm" onClick={onRetry}><RefreshCw className="w-4 h-4" />Retry</Button>
      </div>
    );
  }
  const d = state.data;
  const going = d.recipients.filter(r => r.rsvp_status === 'yes').length;
  const maybe = d.recipients.filter(r => r.rsvp_status === 'maybe').length;
  const declined = d.recipients.filter(r => r.rsvp_status === 'no').length;
  const parts: string[] = [];
  if (going > 0) parts.push(`${going} already going`);
  if (maybe > 0) parts.push(`${maybe} maybe`);
  if (declined > 0) parts.push(`${declined} can't make it`);
  if (d.already_reminded > 0) parts.push(`${d.already_reminded} already reminded`);
  if (d.unsubscribed > 0) parts.push(`${d.unsubscribed} unsubscribed`);
  if (d.unreachable > 0) parts.push(`${d.unreachable} without a usable email`);
  return (
    <div className="text-sm" data-state="preview-ready">
      <p>
        <strong>{plural(d.recipient_count, 'member', 'members')}</strong> will receive it, out of {plural(d.accounts, 'account', 'accounts')}.
      </p>
      {parts.length > 0 && <p className="text-foreground-muted mt-1">{parts.join(' · ')}.</p>}
      <p className="text-foreground-muted mt-1">Subject: <span className="text-foreground">{d.subject}</span></p>
    </div>
  );
}
