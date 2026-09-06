/**
 * Scheduled reminder tick — replaces netlify/functions/reminders-tick.mts.
 * Every 10 minutes, POST to the app's /api/cron/reminders with CRON_SECRET,
 * exactly like the Netlify scheduled function did. The queue-draining logic
 * stays in the Next.js app so there is one code path for sending.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';

const CRON_SECRET = defineSecret('CRON_SECRET');
const SITE_URL = defineString('SITE_URL', { default: 'https://gayiclub.com' });

export const remindersTick = onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'America/New_York', secrets: [CRON_SECRET], region: 'us-east4' },
  async () => {
    const target = `${SITE_URL.value().replace(/\/$/, '')}/api/cron/reminders?limit=50`;
    const res = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET.value()}` },
    });
    const body = await res.text();
    if (!res.ok) {
      logger.error('reminders tick failed', { status: res.status, body: body.slice(0, 500) });
      throw new Error(`reminders tick ${res.status}`);
    }
    logger.info('reminders tick ok', { body: body.slice(0, 500) });
  }
);

async function invokeAutomation(path: string) {
  const res = await fetch(`${SITE_URL.value().replace(/\/$/, '')}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${CRON_SECRET.value()}` },
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Automation ${path} failed: ${res.status}`);
  logger.info('Automation completed', { path, result: await res.json() });
}
export const newsTick = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'America/New_York', secrets: [CRON_SECRET], region: 'us-east4', timeoutSeconds: 180 },
  () => invokeAutomation('/api/cron/news')
);
export const meetingPollTick = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'America/New_York', secrets: [CRON_SECRET], region: 'us-east4', timeoutSeconds: 180 },
  () => invokeAutomation('/api/cron/meeting-polls')
);
