-- Gay I Club Hub Upgrade
-- Adds: recurring meetings, newsfeed (posts/comments/reactions), email reminder queue,
-- and meeting notes. Run AFTER "Supabase Requirements.txt" baseline and "Supabase Production.sql".
-- Idempotent: safe to re-run.

create extension if not exists pgcrypto;

-- =====================================================================
-- 1) Recurring meetings: extend events table
-- =====================================================================
-- Strategy: each meeting occurrence is its own row in `events`.
-- Recurring meetings share a `series_id` and carry a `recurrence_rule`
-- (e.g. "FREQ=WEEKLY;INTERVAL=2;BYDAY=TU") on every instance for context.
-- Per-instance edits stay local; series-wide edits target series_id.

alter table events add column if not exists series_id uuid;
alter table events add column if not exists recurrence_rule text;
alter table events add column if not exists recurrence_until timestamptz;
alter table events add column if not exists notes text; -- post-meeting recap (markdown)
alter table events add column if not exists updated_at timestamptz default now();

create index if not exists events_series_id_idx on events (series_id);
create index if not exists events_event_datetime_idx on events (event_datetime);

drop trigger if exists trg_events_updated_at on events;
create trigger trg_events_updated_at
before update on events
for each row execute function set_updated_at();

-- =====================================================================
-- 2) Newsfeed: posts, comments, reactions
-- =====================================================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null,
  event_id uuid references events(id) on delete set null,
  is_announcement boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_event_id_idx on posts (event_id);

drop trigger if exists trg_posts_updated_at on posts;
create trigger trg_posts_updated_at
before update on posts
for each row execute function set_updated_at();

alter table posts enable row level security;

drop policy if exists "posts select" on posts;
create policy "posts select" on posts for select to authenticated using (true);

drop policy if exists "posts insert" on posts;
create policy "posts insert" on posts for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and (is_pinned = false or is_admin())
    and (is_announcement = false or is_admin())
  );

drop policy if exists "posts update" on posts;
create policy "posts update" on posts for update to authenticated
  using (author_user_id = auth.uid() or is_admin())
  with check (
    (author_user_id = auth.uid() or is_admin())
    and (is_pinned = false or is_admin())
    and (is_announcement = false or is_admin())
  );

drop policy if exists "posts delete" on posts;
create policy "posts delete" on posts for delete to authenticated
  using (author_user_id = auth.uid() or is_admin());

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists post_comments_post_id_idx on post_comments (post_id, created_at);

alter table post_comments enable row level security;

drop policy if exists "post_comments select" on post_comments;
create policy "post_comments select" on post_comments for select to authenticated using (true);

drop policy if exists "post_comments insert" on post_comments;
create policy "post_comments insert" on post_comments for insert to authenticated
  with check (author_user_id = auth.uid());

drop policy if exists "post_comments update" on post_comments;
create policy "post_comments update" on post_comments for update to authenticated
  using (author_user_id = auth.uid() or is_admin())
  with check (author_user_id = auth.uid() or is_admin());

drop policy if exists "post_comments delete" on post_comments;
create policy "post_comments delete" on post_comments for delete to authenticated
  using (author_user_id = auth.uid() or is_admin());

create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id, emoji)
);

create index if not exists post_reactions_post_id_idx on post_reactions (post_id);

alter table post_reactions enable row level security;

drop policy if exists "post_reactions select" on post_reactions;
create policy "post_reactions select" on post_reactions for select to authenticated using (true);

drop policy if exists "post_reactions insert" on post_reactions;
create policy "post_reactions insert" on post_reactions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "post_reactions delete" on post_reactions;
create policy "post_reactions delete" on post_reactions for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================================
-- 3) Email reminder queue (server processes via cron)
-- =====================================================================
-- One row per scheduled email send. Cron job pulls due rows, sends, marks sent.
create table if not exists email_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  recipient_email text not null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('event_reminder','rsvp_confirmation','agenda_published','event_cancelled','digest','custom')),
  subject text not null,
  body_html text not null,
  body_text text,
  send_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
  error text,
  attempts int not null default 0,
  created_at timestamptz default now()
);

create index if not exists email_reminders_due_idx on email_reminders (status, send_at) where status = 'pending';
create index if not exists email_reminders_event_id_idx on email_reminders (event_id);

alter table email_reminders enable row level security;

-- No public policies: only service role writes/reads (server cron + API routes).
-- Authenticated users can see their own queued reminders for transparency.
drop policy if exists "email_reminders self-select" on email_reminders;
create policy "email_reminders self-select" on email_reminders for select to authenticated
  using (recipient_user_id = auth.uid());

-- =====================================================================
-- 4) Helper view: upcoming meetings with RSVP & series context
-- =====================================================================
create or replace view v_upcoming_events as
select
  e.id,
  e.title,
  e.description,
  e.event_datetime,
  e.location,
  e.agenda,
  e.notes,
  e.series_id,
  e.recurrence_rule,
  e.recurrence_until,
  e.created_at,
  e.updated_at,
  (select count(*) from rsvps r where r.event_id = e.id) as rsvp_count
from events e
where e.event_datetime >= now()
order by e.event_datetime asc;

grant select on v_upcoming_events to anon, authenticated;

-- =====================================================================
-- 5) Notes
-- =====================================================================
-- - Recurring meeting creation: app generates N concrete events sharing a new
--   series_id; recurrence_rule is stored on each instance for context only.
-- - To extend a series, generate more instances and assign the same series_id.
-- - email_reminders: writes via service role from /api/cron/reminders and on-demand
--   API routes (e.g. RSVP confirmation). Keep server-only.
