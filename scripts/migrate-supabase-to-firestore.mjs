#!/usr/bin/env node
/**
 * One-shot data migration: Supabase (Postgres) → Firestore.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node scripts/migrate-supabase-to-firestore.mjs [--dry-run] [--only=events,rsvps]
 *
 * Auth users are NOT migrated here — use `firebase auth:import` (see
 * MIGRATION_FIREBASE.md §4). This script copies rows table-by-table into
 * same-named collections, preserving Postgres uuids as document ids so every
 * foreign key keeps working. Composite-key tables get deterministic ids.
 * Idempotent: re-running overwrites the same documents.
 */
import { createClient } from '@supabase/supabase-js';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const DRY = process.argv.includes('--dry-run');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const db = getFirestore();

// Columns holding timestamps → Firestore Timestamp so range queries order correctly.
const TS = new Set([
  'created_at', 'updated_at', 'event_datetime', 'recurrence_until', 'send_at', 'sent_at', 'expires_at',
  'published_at', 'closes_at', 'option_datetime', 'email_opt_in_at', 'email_opt_out_at', 'sms_opt_in_at',
  'sms_opt_out_at', 'consumed_at', 'event_date',
]);

/** table → how to derive the document id */
const TABLES = {
  app_admins: r => r.user_id,
  user_profiles: r => r.id,
  profiles: r => r.id,
  interests: r => r.id,
  user_interests: r => `${r.user_id}_${r.interest_id}`,
  events: r => r.id,
  rsvps: r => `${r.event_id}_${r.profile_id}`,
  alerts_subscribers: r => r.id,
  alerts_confirmations: r => r.id,
  announcements: r => r.id,
  resources: r => r.id,
  chat_channels: r => r.id ?? r.slug,
  posts: r => r.id,
  post_comments: r => r.id,
  post_reactions: r => `${r.post_id}_${r.user_id}_${r.emoji ?? r.reaction ?? 'like'}`,
  news_items: r => r.id,
  news_saves: r => `${r.news_id ?? r.news_item_id}_${r.user_id}`,
  robot_benchmarks: r => r.id,
  email_reminders: r => r.id,
  meeting_polls: r => r.id,
  meeting_poll_options: r => r.id,
  meeting_poll_votes: r => `${r.poll_id}_${r.user_id}_${r.option_id}`,
  agenda_suggestions: r => r.id,
  agenda_suggestion_votes: r => `${r.suggestion_id}_${r.user_id}`,
};

function convert(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    out[k] = TS.has(k) && typeof v === 'string' ? Timestamp.fromDate(new Date(v)) : v;
  }
  return out;
}

async function fetchAll(table) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select('*').range(from, from + page - 1);
    if (error) {
      if (/does not exist|relation/.test(error.message)) return null; // table absent in this DB
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return rows;
}

let grand = 0;
for (const [table, idOf] of Object.entries(TABLES)) {
  if (ONLY && !ONLY.has(table)) continue;
  const rows = await fetchAll(table);
  if (rows === null) { console.log(`- ${table}: (not in source DB, skipped)`); continue; }
  console.log(`${DRY ? '[dry] ' : ''}${table}: ${rows.length} rows`);
  if (DRY) continue;
  let batch = db.batch();
  let n = 0;
  for (const row of rows) {
    const id = String(idOf(row));
    batch.set(db.collection(table).doc(id), convert(row), { merge: true });
    if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (n % 400) await batch.commit();
  grand += rows.length;
}
console.log(`done — ${grand} documents written${DRY ? ' (dry run, nothing written)' : ''}`);
