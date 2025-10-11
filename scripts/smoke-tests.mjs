#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let failures = 0;

function ok(cond, msg) {
  if (cond) {
    console.log(`✓ ${msg}`);
  } else {
    failures++;
    console.error(`✗ ${msg}`);
  }
}

function file(path) {
  return join(root, path);
}

function has(path, msg) {
  ok(existsSync(file(path)), msg || `file exists: ${path}`);
}

function contains(path, re, msg) {
  const p = file(path);
  if (!existsSync(p)) { ok(false, `${path} not found`); return; }
  const txt = readFileSync(p, 'utf8');
  ok(re.test(txt), msg || `pattern found in ${path}`);
}

console.log('Running smoke tests...');

// Core pages and APIs
has('app/events/page.tsx');
has('app/events/[id]/page.tsx');
has('app/events/my/page.tsx');
has('app/alerts/page.tsx');
has('app/alerts/unsubscribe/page.tsx');
has('app/alerts/confirm/page.tsx');
has('app/alerts/unsubscribe/confirm/page.tsx');
has('app/auth/sign-in/page.tsx');

has('app/api/chat/route.ts');
has('app/api/invite/route.ts');
has('app/api/alerts/subscribe/route.ts');
has('app/api/alerts/unsubscribe/route.ts');
has('app/api/alerts/confirm/route.ts');
has('app/api/alerts/unsubscribe/confirm/route.ts');

// Libs
has('lib/calendar.ts');
has('lib/rsvp.ts');
has('lib/events.ts');
has('lib/rateLimit.ts');
has('lib/tokens.ts');

// Specific content checks
contains('app/api/invite/route.ts', /club that includes the URL/, 'invite prompt spacing fixed');
contains('components/ChatWindow.tsx', /AbortController/, 'chat uses AbortController');
contains('components/ChatWindow.tsx', /bg-gray-100|dark:bg-gray-800/, 'chat uses concrete Tailwind utilities');
contains('app/api/chat/route.ts', /rateLimit\(|getClientId\(/, 'chat route rate limited');
contains('app/api/invite/route.ts', /rateLimit\(|getClientId\(/, 'invite route rate limited');
contains('app/api/chat/route.ts', /system.*Upcoming events|getUpcomingEvents\(/, 'chat enriched with upcoming events');
contains('lib/calendar.ts', /export function buildICS|downloadICS|googleCalendarUrl/, 'calendar helpers exported');
contains('lib/rsvp.ts', /export async function deleteRsvp|getRsvpedEventIds/, 'rsvp helpers added');
contains('app/api/alerts/confirm/route.ts', /alerts_confirmations|subscribe/, 'subscribe confirmation handler');
contains('app/api/alerts/unsubscribe/confirm/route.ts', /alerts_confirmations|unsubscribe/, 'unsubscribe confirmation handler');
contains('app/api/alerts/subscribe/route.ts', /generateToken|alerts_confirmations/, 'subscribe creates confirmation tokens');
contains('app/api/alerts/unsubscribe/route.ts', /generateToken|alerts_confirmations/, 'unsubscribe creates confirmation tokens');

// TypeScript config sanity
has('tsconfig.json');
contains('tsconfig.json', /"strict"\s*:\s*true/, 'TS strict mode enabled');

// README mentions schema for new features
contains('README.md', /alerts_subscribers|alerts_confirmations/, 'README documents alerts tables');

console.log(`\nSmoke tests ${failures ? 'found issues' : 'passed'} (${failures} failure(s)).`);
process.exit(failures ? 1 : 0);

