/**
 * Netlify Scheduled Function — pings the Next.js cron endpoint that drains
 * the email_reminders queue. Runs every 10 minutes in production.
 *
 * Required env vars (set in Netlify UI → Site settings → Environment):
 *   - URL                (set automatically by Netlify; production site URL)
 *   - CRON_SECRET        (shared secret with /api/cron/reminders)
 *
 * Optional:
 *   - REMINDER_TICK_LIMIT  (max rows per tick; defaults to 50)
 *
 * Deploy: this file is auto-discovered. The schedule is read from the
 * `config` export at deploy time. To change the cadence, update `schedule`
 * and redeploy.
 */

export default async () => {
  const siteUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'missing URL or CRON_SECRET env var',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const limit = process.env.REMINDER_TICK_LIMIT || '50';
  const target = `${siteUrl.replace(/\/$/, '')}/api/cron/reminders?limit=${encodeURIComponent(limit)}`;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        target,
        response: safeJson(body),
      }),
      {
        status: res.ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 500);
  }
}

export const config = {
  schedule: '*/10 * * * *',
};
