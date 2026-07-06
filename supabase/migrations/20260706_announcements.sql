-- Official club announcements.
-- Members can read; admins create, edit, and delete.

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists announcements_created_at_idx on announcements (created_at desc);

drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at
before update on announcements
for each row execute function set_updated_at();

alter table announcements enable row level security;

drop policy if exists "announcements select" on announcements;
create policy "announcements select" on announcements for select to authenticated using (true);

drop policy if exists "announcements admin insert" on announcements;
create policy "announcements admin insert" on announcements for insert to authenticated
  with check (author_user_id = auth.uid() and is_admin());

drop policy if exists "announcements admin update" on announcements;
create policy "announcements admin update" on announcements for update to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "announcements admin delete" on announcements;
create policy "announcements admin delete" on announcements for delete to authenticated
  using (is_admin());
