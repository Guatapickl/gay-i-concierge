-- Supabase Production-Hardened Setup for Gay-I Club Concierge
-- This script tightens RLS and introduces admin-only writes via an admins table.
-- Use alongside the baseline setup in "Supabase Requirements.txt".

-- 0) Pre-req: Extensions
create extension if not exists pgcrypto;

-- 1) Admins model (preferred over JWT custom claim for simplicity)
--    Add admin users by auth UID. App checks admin via this table in policies/functions.
create table if not exists app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Helper function: is_admin() returns true if auth.uid() is listed
create or replace function is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from app_admins where user_id = auth.uid()
  );
$$;

-- 2) user_profiles hardening
-- Keep self-only access from baseline. Optional: constrain email to JWT email when present.
-- (Commented example — enable if you want to enforce email sync.)
-- drop policy if exists "profile self-update" on user_profiles;
-- create policy "profile self-update" on user_profiles
--   for update using (auth.uid() = id)
--   with check (auth.uid() = id and (email is null or email = (auth.jwt() ->> 'email')));

-- 3) interests hardening
-- In production, prefer curated interests. Limit writes to admins.
alter table interests enable row level security;
drop policy if exists "interests insert" on interests;
create policy "interests insert admin" on interests for insert to authenticated
  with check (is_admin());

-- 4) events hardening
-- Replace permissive write policies with admin-only
alter table events add column if not exists agenda jsonb;
alter table events enable row level security;
drop policy if exists "events insert" on events;
drop policy if exists "events update" on events;
drop policy if exists "events delete" on events;

create policy "events select" on events for select using (true);
create policy "events insert admin" on events for insert to authenticated with check (is_admin());
create policy "events update admin" on events for update to authenticated using (is_admin());
create policy "events delete admin" on events for delete to authenticated using (is_admin());

-- 5) rsvps hardening
-- Self-service RSVP remains (ties to auth.uid()). Optional: prevent RSVPs to past events.
alter table rsvps enable row level security;
drop policy if exists "rsvps self-select" on rsvps;
drop policy if exists "rsvps self-insert" on rsvps;
drop policy if exists "rsvps self-delete" on rsvps;

create policy "rsvps self-select" on rsvps for select using (profile_id = auth.uid());
create policy "rsvps self-insert" on rsvps for insert with check (
  profile_id = auth.uid()
  and exists (
    select 1 from events e
    where e.id = rsvps.event_id and e.event_datetime >= now()
  )
);
create policy "rsvps self-delete" on rsvps for delete using (profile_id = auth.uid());

-- 6) alerts hardening (recommended: service role usage in API routes)
-- In production, run subscribe/unsubscribe/confirm routes with the SUPABASE_SERVICE_ROLE key
-- so they execute as service role and bypass RLS. Therefore, remove permissive anon write policies.
alter table alerts_subscribers enable row level security;
drop policy if exists "alerts insert anon" on alerts_subscribers;
drop policy if exists "alerts insert auth" on alerts_subscribers;
drop policy if exists "alerts update" on alerts_subscribers;

-- Read-only for public; writes should occur via server (service role) only
drop policy if exists "alerts select" on alerts_subscribers;
create policy "alerts select" on alerts_subscribers for select using (true);

alter table alerts_confirmations enable row level security;
drop policy if exists "alerts tokens select" on alerts_confirmations;
drop policy if exists "alerts tokens insert" on alerts_confirmations;
drop policy if exists "alerts tokens update" on alerts_confirmations;

-- Keep read for troubleshooting; write via service role only
create policy "alerts tokens select" on alerts_confirmations for select using (true);
-- No insert/update policies here: service role will bypass RLS for writes

-- If you cannot use service role, alternative is to provide SECURITY DEFINER RPCs that perform
-- strict validations and then write (still recommended to keep general writes closed).

-- 6a) Optional RPC to create alert tokens (subscribe/unsubscribe)
-- Security definer uses table owner privileges; ensure function owner is table owner.
create or replace function rpc_create_alert_token(
  p_action text, -- 'subscribe' | 'unsubscribe'
  p_channel text, -- 'email' | 'sms'
  p_email text default null,
  p_phone text default null,
  p_ttl_hours int default 24
) returns text
language plpgsql
security definer
as $$
declare
  v_token text;
  v_expires timestamptz;
begin
  if p_action not in ('subscribe','unsubscribe') then
    raise exception 'invalid action';
  end if;
  if p_channel not in ('email','sms') then
    raise exception 'invalid channel';
  end if;
  if p_channel = 'email' and (p_email is null or position('@' in p_email) = 0) then
    raise exception 'invalid email';
  end if;
  if p_channel = 'sms' and (p_phone is null) then
    raise exception 'invalid phone';
  end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + make_interval(hours => p_ttl_hours);
  insert into alerts_confirmations(token, action, channel, email, phone, expires_at)
  values (v_token, p_action, p_channel, p_email, p_phone, v_expires);
  return v_token;
end $$;

-- 6b) Optional RPC to consume a token and toggle opt-in
create or replace function rpc_consume_alert_token(p_token text) returns boolean
language plpgsql
security definer
as $$
declare
  r record;
begin
  select * into r from alerts_confirmations
  where token = p_token and consumed_at is null
  limit 1;
  if not found then
    return false;
  end if;
  if r.expires_at is not null and r.expires_at < now() then
    return false;
  end if;
  if r.action = 'subscribe' then
    if r.channel = 'email' and r.email is not null then
      insert into alerts_subscribers(email, email_opt_in)
      values (r.email, true)
      on conflict (email) do update set email_opt_in = excluded.email_opt_in;
    elsif r.channel = 'sms' and r.phone is not null then
      insert into alerts_subscribers(phone, sms_opt_in)
      values (r.phone, true)
      on conflict (phone) do update set sms_opt_in = excluded.sms_opt_in;
    else
      return false;
    end if;
  elsif r.action = 'unsubscribe' then
    if r.channel = 'email' and r.email is not null then
      update alerts_subscribers set email_opt_in = false where email = r.email;
    elsif r.channel = 'sms' and r.phone is not null then
      update alerts_subscribers set sms_opt_in = false where phone = r.phone;
    else
      return false;
    end if;
  else
    return false;
  end if;
  update alerts_confirmations set consumed_at = now() where token = p_token;
  return true;
end $$;

-- 7) Grants (optional): allow anon/auth to call the RPCs; logic is enforced within functions
grant execute on function rpc_create_alert_token(text, text, text, text, int) to anon, authenticated;
grant execute on function rpc_consume_alert_token(text) to anon, authenticated;

-- 8) Notes

-- 9) Resources library (admin-augmented RLS)
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  title text not null,
  description text,
  category text,
  tags text[] default '{}',
  is_pinned boolean not null default false,
  clicks int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table resources enable row level security;

drop policy if exists "resources select" on resources;
create policy "resources select" on resources for select to authenticated using (true);

drop policy if exists "resources insert" on resources;
create policy "resources insert" on resources for insert to authenticated with check (owner_user_id = auth.uid() or is_admin());

drop policy if exists "resources update" on resources;
create policy "resources update" on resources for update to authenticated using (owner_user_id = auth.uid() or is_admin()) with check (owner_user_id = auth.uid() or is_admin());

drop policy if exists "resources delete" on resources;
create policy "resources delete" on resources for delete to authenticated using (owner_user_id = auth.uid() or is_admin());
-- - Ensure that your Next.js API routes handling alerts run server-side (Node runtime) and
--   use either the service role client or call the above RPCs. Do NOT run service role in the browser.
-- - Admin management: insert your UID(s) into app_admins to gain event/interest write access:
--   insert into app_admins(user_id) values ('<your-auth-uid>') on conflict do nothing;
-- - Consider adding database constraints and indices fitting your usage patterns.
