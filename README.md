# Gay-I Club Concierge

This is a [Next.js](https://nextjs.org) app with a simple AI concierge chat, event management (Supabase), and an invite generator.

## Features

- RSVP only allowed after completing onboarding.
- `/invite` page generates a short invite and supports copy to clipboard.

## Getting Started

1) Create a `.env.local` with the required variables (see `.env.example`).

2) Install and run the dev server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

Provide these in `.env.local` (do not commit secrets):

```
OPENAI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # server-only, used by alerts endpoints in production
```

Note: Ensure Supabase RLS policies allow the intended anon operations or move sensitive mutations server-side.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Notes

- Tailwind v4 tokens are defined inline in `app/globals.css`. Avoid undefined utility names like `bg-primary`; use defined tokens or standard utilities.
- Streaming chat is handled via SSE; the UI cancels prior requests when a new message is sent.
- Alerts: `/alerts` lets users subscribe to email and/or SMS alerts via `/api/alerts/subscribe` (rate limited). Create the following Supabase table:

```
create table if not exists alerts_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  email_opt_in boolean not null default false,
  sms_opt_in boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Optional: prevent duplicates
create unique index if not exists alerts_email_unique on alerts_subscribers (email) where email is not null;
create unique index if not exists alerts_phone_unique on alerts_subscribers (phone) where phone is not null;

-- RLS (adjust to your needs)
alter table alerts_subscribers enable row level security;
create policy "allow inserts" on alerts_subscribers for insert to anon with check (true);

-- Allow self-service updates to opt-out by matching email/phone
create policy "allow updates to opt-out by email" on alerts_subscribers
  for update to anon using (true) with check (email = current_setting('request.jwt.claim.email', true) or email is not null);
create policy "allow updates by phone" on alerts_subscribers
  for update to anon using (true) with check (phone is not null);

-- Alternatively, loosen for demo purposes (update by matching email/phone filters)
-- create policy "allow updates anon" on alerts_subscribers for update to anon using (true) with check (true);

```

Unsubscribe:

- Page: `/alerts/unsubscribe` with email/phone form and channel selection.
- API: `POST /api/alerts/unsubscribe` sets `email_opt_in` and/or `sms_opt_in` to false for matching records.

Double Opt-In (confirm by token):

- Confirm endpoints:
  - `GET /api/alerts/confirm?token=...` (subscribes specific channel)
  - `GET /api/alerts/unsubscribe/confirm?token=...` (unsubscribes specific channel)
- UI pages:
  - `/alerts/confirm` and `/alerts/unsubscribe/confirm` read token from URL and call APIs.
- Tokens table:

```
create table if not exists alerts_confirmations (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  action text not null check (action in ('subscribe','unsubscribe')),
  channel text not null check (channel in ('email','sms')),
  email text,
  phone text,
  expires_at timestamp with time zone,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
create index if not exists alerts_confirmations_token_idx on alerts_confirmations (token);
```

In production, send email/SMS containing links to these pages. During development, the subscribe/unsubscribe APIs return generated tokens in the response for testing.

Auth and Profiles:

- Email/password sign up: `/auth/sign-up`, email/password sign in: `/auth/sign-in`. Magic link and Google OAuth remain available.
- Profile management: `/profile` lets authenticated users edit name, phone, experience level, interests, and opt-in/out of email/SMS alerts.
- Configure Supabase Auth site URL to your deployment and enable any OAuth providers you want.

Supabase schema additions (run in SQL editor):

```
-- User profiles keyed by auth.users.id (separate from existing anon 'profiles' used by chat onboarding)
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  experience_level text check (experience_level in ('none','beginner','intermediate','advanced')),
  interests text[] default '{}',
  created_at timestamptz default now()
);

-- Interests catalog and user join table
create table if not exists interests (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists user_interests (
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_id uuid not null references interests(id) on delete cascade,
  primary key (user_id, interest_id)
);

-- RLS policies
alter table user_profiles enable row level security;
create policy "profile self-select" on user_profiles for select using (auth.uid() = id);
create policy "profile self-upsert" on user_profiles for insert with check (auth.uid() = id);
create policy "profile self-update" on user_profiles for update using (auth.uid() = id);

alter table interests enable row level security;
-- Read for everyone; restrict inserts in production as needed
create policy "interests read" on interests for select using (true);
create policy "interests insert" on interests for insert to authenticated with check (true);

alter table user_interests enable row level security;
create policy "user_interests self-select" on user_interests for select using (auth.uid() = user_id);
create policy "user_interests self-insert" on user_interests for insert with check (auth.uid() = user_id);
create policy "user_interests self-delete" on user_interests for delete using (auth.uid() = user_id);

-- Alerts tables from earlier notes
-- Ensure select permissions for reading current opt-in status
alter table alerts_subscribers enable row level security;
do $$ begin
  perform 1;
exception when undefined_table then null; end $$;
-- Example permissive policies for demo; tighten in production
create policy if not exists "alerts select" on alerts_subscribers for select using (true);
create policy if not exists "alerts insert anon" on alerts_subscribers for insert to anon with check (true);
create policy if not exists "alerts insert auth" on alerts_subscribers for insert to authenticated with check (true);
create policy if not exists "alerts update" on alerts_subscribers for update using (true) with check (true);
```

Notes:

- The profile page uses the authenticated user’s ID to upsert into `profiles` and to manage `user_interests`.
- Email/SMS opt-in toggles call the existing `/api/alerts/subscribe` and `/api/alerts/unsubscribe` endpoints using the saved email/phone.
- If you prefer to bind alert subscriptions to `auth.uid()` directly, add a `user_id` column to `alerts_subscribers` and adjust the code/policies accordingly.

Production security:

- For alerts subscribe/unsubscribe/confirm routes, production uses a service-role Supabase client on server-only Node runtime. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Alternatively, use the included `Supabase Production.sql` to lock tables and call provided RPCs instead of service role.
```
