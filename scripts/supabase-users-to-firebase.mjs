#!/usr/bin/env node
/**
 * Convert a Supabase auth.users export into Firebase's `auth:import` JSON.
 *
 * 1) In the Supabase SQL editor run and download as CSV → users.csv:
 *      select id, email, encrypted_password, email_confirmed_at, raw_user_meta_data,
 *             (select string_agg(provider, ',') from auth.identities i where i.user_id = u.id) as providers
 *      from auth.users u;
 * 2) node scripts/supabase-users-to-firebase.mjs users.csv > users.json
 * 3) firebase auth:import users.json --hash-algo=BCRYPT --project gayiclub
 *
 * Supabase uses bcrypt ($2a$…); Firebase imports bcrypt hashes verbatim (base64-encoded
 * in the JSON), so nobody has to reset their password. localId = the Supabase uuid, which
 * keeps every user_id / profile_id / author_user_id reference in Firestore valid.
 * Google-only users get no passwordHash and link on their next Google sign-in.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/supabase-users-to-firebase.mjs users.csv > users.json');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(r => r.length > 1 || r[0]);
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

const users = parseCsv(readFileSync(file, 'utf8')).map(u => {
  let meta = {};
  try { meta = u.raw_user_meta_data ? JSON.parse(u.raw_user_meta_data) : {}; } catch {}
  const out = {
    localId: u.id,
    email: u.email,
    emailVerified: !!u.email_confirmed_at,
    displayName: meta.full_name || meta.name || undefined,
    photoUrl: meta.avatar_url || meta.picture || undefined,
  };
  if (u.encrypted_password && u.encrypted_password.startsWith('$2')) {
    out.passwordHash = Buffer.from(u.encrypted_password).toString('base64');
  }
  const providers = (u.providers || '').split(',').map(s => s.trim()).filter(Boolean);
  if (providers.includes('google') && meta.sub) {
    out.providerUserInfo = [{ providerId: 'google.com', rawId: String(meta.sub), email: u.email, displayName: out.displayName }];
  }
  return out;
});

process.stdout.write(JSON.stringify({ users }, null, 2));
console.error(`converted ${users.length} users (${users.filter(u => u.passwordHash).length} with password hashes)`);
