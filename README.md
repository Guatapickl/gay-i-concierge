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

Auth (optional):

- Simple login page at `/auth/sign-in` supporting magic link and Google OAuth via Supabase Auth. Configure providers in the Supabase dashboard and set site URL to your deployment.
```
