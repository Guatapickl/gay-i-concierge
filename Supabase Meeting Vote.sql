-- Gay I Club — Meeting date voting + member agenda suggestions
-- Run AFTER "Supabase Hub Upgrade.sql". Idempotent: safe to re-run.

create extension if not exists pgcrypto;

-- =====================================================================
-- 1) Meeting date polls (ranked-choice)
-- =====================================================================
create table if not exists meeting_polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid references auth.users(id) on delete set null,
  event_id uuid references events(id) on delete set null,   -- set once the winning date becomes a meeting
  closes_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists meeting_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references meeting_polls(id) on delete cascade,
  option_datetime timestamptz not null,
  label text,
  sort_order int not null default 0
);

create table if not exists meeting_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references meeting_polls(id) on delete cascade,
  option_id uuid not null references meeting_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank int not null check (rank >= 1),
  created_at timestamptz default now(),
  unique (poll_id, option_id, user_id)
);

create index if not exists meeting_poll_options_poll_idx on meeting_poll_options (poll_id, sort_order);
create index if not exists meeting_poll_votes_poll_idx on meeting_poll_votes (poll_id);

drop trigger if exists trg_meeting_polls_updated_at on meeting_polls;
create trigger trg_meeting_polls_updated_at
before update on meeting_polls
for each row execute function set_updated_at();

alter table meeting_polls enable row level security;
alter table meeting_poll_options enable row level security;
alter table meeting_poll_votes enable row level security;

drop policy if exists "polls select" on meeting_polls;
create policy "polls select" on meeting_polls for select to authenticated using (true);
drop policy if exists "polls insert admin" on meeting_polls;
create policy "polls insert admin" on meeting_polls for insert to authenticated with check (is_admin());
drop policy if exists "polls update admin" on meeting_polls;
create policy "polls update admin" on meeting_polls for update to authenticated using (is_admin());
drop policy if exists "polls delete admin" on meeting_polls;
create policy "polls delete admin" on meeting_polls for delete to authenticated using (is_admin());

drop policy if exists "poll options select" on meeting_poll_options;
create policy "poll options select" on meeting_poll_options for select to authenticated using (true);
drop policy if exists "poll options insert admin" on meeting_poll_options;
create policy "poll options insert admin" on meeting_poll_options for insert to authenticated with check (is_admin());
drop policy if exists "poll options delete admin" on meeting_poll_options;
create policy "poll options delete admin" on meeting_poll_options for delete to authenticated using (is_admin());

-- Votes are readable by every member so the tally can be shown to the room.
drop policy if exists "poll votes select" on meeting_poll_votes;
create policy "poll votes select" on meeting_poll_votes for select to authenticated using (true);
drop policy if exists "poll votes self insert" on meeting_poll_votes;
create policy "poll votes self insert" on meeting_poll_votes for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from meeting_polls p where p.id = poll_id and p.status = 'open')
);
drop policy if exists "poll votes self delete" on meeting_poll_votes;
create policy "poll votes self delete" on meeting_poll_votes for delete to authenticated using (user_id = auth.uid());

-- =====================================================================
-- 2) Member agenda suggestions (topics members want to discuss)
-- =====================================================================
create table if not exists agenda_suggestions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,   -- null = "next meeting, whichever it is"
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  title text not null,
  notes text,
  status text not null default 'proposed' check (status in ('proposed','accepted','declined')),
  created_at timestamptz default now()
);

create table if not exists agenda_suggestion_votes (
  suggestion_id uuid not null references agenda_suggestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (suggestion_id, user_id)
);

create index if not exists agenda_suggestions_event_idx on agenda_suggestions (event_id, created_at);

alter table agenda_suggestions enable row level security;
alter table agenda_suggestion_votes enable row level security;

drop policy if exists "suggestions select" on agenda_suggestions;
create policy "suggestions select" on agenda_suggestions for select to authenticated using (true);
drop policy if exists "suggestions self insert" on agenda_suggestions;
create policy "suggestions self insert" on agenda_suggestions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "suggestions update" on agenda_suggestions;
create policy "suggestions update" on agenda_suggestions for update to authenticated
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
drop policy if exists "suggestions delete" on agenda_suggestions;
create policy "suggestions delete" on agenda_suggestions for delete to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists "suggestion votes select" on agenda_suggestion_votes;
create policy "suggestion votes select" on agenda_suggestion_votes for select to authenticated using (true);
drop policy if exists "suggestion votes self insert" on agenda_suggestion_votes;
create policy "suggestion votes self insert" on agenda_suggestion_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "suggestion votes self delete" on agenda_suggestion_votes;
create policy "suggestion votes self delete" on agenda_suggestion_votes for delete to authenticated using (user_id = auth.uid());

-- Allow poll/result emails through the existing reminder queue.
alter table email_reminders drop constraint if exists email_reminders_kind_check;
alter table email_reminders add constraint email_reminders_kind_check
  check (kind in ('event_reminder','rsvp_confirmation','agenda_published','event_cancelled','digest','custom','poll_invite','poll_result'));
