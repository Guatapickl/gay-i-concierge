/**
 * Tiny Resend client. Uses fetch directly to avoid adding a dependency.
 * Set RESEND_API_KEY and EMAIL_FROM env vars in production.
 *
 * In development, if RESEND_API_KEY is missing the function logs the email
 * and returns success so flows are testable locally.
 */

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Override for one-off sends; otherwise EMAIL_FROM env var is used. */
  from?: string;
  replyTo?: string;
  /** Used by Resend to dedupe headers if you regenerate templates. */
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string | null; provider: 'resend' | 'console' }
  | { ok: false; error: string };

const DEFAULT_FROM = 'Gay I Club <noreply@gayiclub.com>';

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = args.from || process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email:console]', {
        to: args.to,
        from,
        subject: args.subject,
        text: args.text,
      });
      return { ok: true, id: null, provider: 'console' };
    }
    return { ok: false, error: 'RESEND_API_KEY missing' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: args.replyTo,
        headers: args.headers,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id || null, provider: 'resend' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
