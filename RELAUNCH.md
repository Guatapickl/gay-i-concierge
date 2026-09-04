# Relaunch checklist (Sept 2026)

Hosting is **Firebase App Hosting** with **Firebase Auth + Firestore** as of 2026-09-04 (see MIGRATION_FIREBASE.md §7).
Sections 0–2 below describe the old Netlify/Supabase setup and are kept for history only; §3 still applies.

## 0. Blocker — restore the Supabase project
`fnmtrgsdbkjlmeqesefu.supabase.co` no longer resolves (NXDOMAIN). Free-tier projects are paused after
inactivity and can be **restored** from the Supabase dashboard; if it was deleted, create a new project and
run, in order: `Supabase Requirements.txt` → `Supabase Production.sql` → `Supabase Hub Upgrade.sql` →
`Supabase Meeting Vote.sql`, then put the new URL/keys in Netlify env and `.env`.

## 1. Supabase dashboard
- Run `Supabase Meeting Vote.sql` in the SQL editor (idempotent) — adds date polls + agenda suggestions.
- Auth → Providers → **Google** enabled, with the Google Cloud OAuth client id/secret.
  Authorized redirect URI in Google Cloud: `https://<project>.supabase.co/auth/v1/callback`.
- Auth → URL configuration → Site URL `https://gayiclub.com`; Redirect URLs include
  `https://gayiclub.com/auth/callback`, `https://gayiclub.com/auth/reset`, and the same on `http://localhost:3000`.
- Auth → Email templates: "Reset password" must link to `{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&type=recovery`
  (or leave the default `{{ .ConfirmationURL }}` — the reset page handles code, token_hash and hash flows).
- Add yourself to `app_admins` (`insert into app_admins(user_id) values ('<your auth uid>')`).

## 2. Netlify environment (Site settings → Environment variables)
Production currently answers `CRON_SECRET not configured` at `/api/cron/reminders`, so reminders are **not** live.
Set all of:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SITE_URL=https://gayiclub.com`, `RESEND_API_KEY`, `EMAIL_FROM="Gay I Club <noreply@gayiclub.com>"`,
`CRON_SECRET` (openssl rand -hex 32), `OPENAI_API_KEY`, plus the optional robot/news keys.
Verify the gayiclub.com domain in Resend so mail leaves from `noreply@gayiclub.com`.
After deploy: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://gayiclub.com/api/cron/reminders`
should return `{"ok":true,...}`; the scheduled function `reminders-tick` then runs every 10 minutes.

## 3. Smoke test on production
1. Sign up with email + password (8+ chars) → confirmation email → sign in.
2. Sign in with Google → lands on `/`.
3. Profile → "Set password" for a Google/magic-link account → sign out → sign in with password.
4. Forgot password → email → `/auth/reset` → new password works.
5. `/vote/new` (admin) → create the poll with Sept 12, 13, 19, 20 → "Email members to vote".
6. Vote as a member; confirm standings update.
7. "Create meeting & close poll" → event appears on `/calendar`; "Email the result".
8. RSVP to the event → confirmation email; 24h/1h reminders queue in `email_reminders`.
9. On the event page, suggest a topic and upvote; in `/agenda`, "↓ Member suggestions" imports them.

Reminder emails go only to members who RSVP **and** have "Email updates" on (Profile → Communications).
