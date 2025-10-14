-- App Admins setup & migration helper
-- Run this if your project does not yet have app_admins/is_admin,
-- or if you created a different table name (e.g., public.admin) and want to migrate.

-- 1) Create app_admins table
create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 2) Create helper function
create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

-- 3) Optional migration from an existing public.admin table (if present)
do $$
begin
  if to_regclass('public.admin') is not null then
    -- Try to migrate compatible rows (expects a user_id uuid column)
    begin
      execute 'insert into app_admins(user_id)
               select user_id from public.admin
               on conflict (user_id) do nothing';
    exception when others then
      -- Ignore if schema differs; insert manually instead
      null;
    end;
  end if;
end$$;

-- 4) Insert at least one admin (replace with your auth UID)
-- insert into app_admins(user_id) values ('00000000-0000-0000-0000-000000000000') on conflict do nothing;

