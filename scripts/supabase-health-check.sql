-- Supabase Production Health Check
-- Run this in the Supabase SQL editor. Returns a series of boolean checks.
-- Green across the board = you're ready to deploy with the current codebase.

-- 0) Choose your plan for interests writes:
--    - Admin-only inserts (recommended in production) OR
--    - Authenticated users can insert (looser dev setup)
-- The checks below report both, so you can see which one matches your project.

-- === REQUIREMENTS HEALTH CHECK ===

-- 1) Extension
select 'pgcrypto_installed' as check, exists(
  select 1 from pg_extension where extname='pgcrypto'
) as ok
union all

-- 2) Tables exist
select 'user_profiles_exists', exists(select 1 from pg_tables where schemaname='public' and tablename='user_profiles') union all
select 'interests_exists'    , exists(select 1 from pg_tables where schemaname='public' and tablename='interests')     union all
select 'events_exists'       , exists(select 1 from pg_tables where schemaname='public' and tablename='events')        union all
select 'rsvps_exists'        , exists(select 1 from pg_tables where schemaname='public' and tablename='rsvps')         union all
select 'alerts_subscribers_exists', exists(select 1 from pg_tables where schemaname='public' and tablename='alerts_subscribers') union all
select 'alerts_confirmations_exists', exists(select 1 from pg_tables where schemaname='public' and tablename='alerts_confirmations') union all
select 'app_admins_exists'   , exists(select 1 from pg_tables where schemaname='public' and tablename='app_admins')
union all

-- 3) Function exists
select 'is_admin_function_exists', exists(select 1 from pg_proc where proname='is_admin')
union all

-- 4) RLS flags
select 'user_profiles_rls', coalesce( (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='user_profiles'), false) union all
select 'interests_rls'    , coalesce( (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='interests'), false) union all
select 'events_rls'       , coalesce( (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='events'), false) union all
select 'rsvps_rls'        , coalesce( (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='rsvps'), false) union all
select 'alerts_subscribers_rls', coalesce( (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='alerts_subscribers'), false) union all
select 'alerts_confirmations_rls', coalesce( (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='alerts_confirmations'), false)
union all

-- 5) Policy structure (targeted)
-- user_profiles: at least select + insert + update (3 policies)
select 'user_profiles_policies_ok', (select count(*) from pg_policies where schemaname='public' and tablename='user_profiles') >= 3
union all
-- alerts_*: SELECT-only (writes go via service role / RPCs)
select 'alerts_subscribers_select_only',
  (select count(*) from pg_policies where schemaname='public' and tablename='alerts_subscribers' and cmd='SELECT') >= 1
  and (select count(*) from pg_policies where schemaname='public' and tablename='alerts_subscribers' and cmd in ('INSERT','UPDATE','DELETE')) = 0
union all
select 'alerts_confirmations_select_only',
  (select count(*) from pg_policies where schemaname='public' and tablename='alerts_confirmations' and cmd='SELECT') >= 1
  and (select count(*) from pg_policies where schemaname='public' and tablename='alerts_confirmations' and cmd in ('INSERT','UPDATE','DELETE')) = 0
union all
-- interests INSERT: admin-only (preferred) present?
select 'interests_insert_admin_only',
  exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='interests' and cmd='INSERT'
      and coalesce(with_check,'') ilike '%is_admin%'
  )
union all
-- interests INSERT: authenticated (looser) present? (should be false in production)
select 'interests_insert_authenticated',
  exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='interests' and cmd='INSERT'
      and coalesce(with_check,'') not ilike '%is_admin%'
  )
union all
-- events admin-only writes
select 'events_insert_admin_only', exists (select 1 from pg_policies where schemaname='public' and tablename='events' and cmd='INSERT' and coalesce(with_check,'') ilike '%is_admin%') union all
select 'events_update_admin_only', exists (select 1 from pg_policies where schemaname='public' and tablename='events' and cmd='UPDATE' and coalesce(qual,'')     ilike '%is_admin%') union all
select 'events_delete_admin_only', exists (select 1 from pg_policies where schemaname='public' and tablename='events' and cmd='DELETE' and coalesce(qual,'')     ilike '%is_admin%') union all
-- rsvps: self-service + future-only insert
select 'rsvps_select_self', exists (select 1 from pg_policies where schemaname='public' and tablename='rsvps' and cmd='SELECT' and coalesce(qual,'') ilike '%profile_id = auth.uid()%') union all
select 'rsvps_insert_self', exists (select 1 from pg_policies where schemaname='public' and tablename='rsvps' and cmd='INSERT' and coalesce(with_check,'') ilike '%profile_id = auth.uid()%') union all
select 'rsvps_insert_future_only', exists (select 1 from pg_policies where schemaname='public' and tablename='rsvps' and cmd='INSERT' and coalesce(with_check,'') ilike '%event_datetime%>= now()%') union all
select 'rsvps_delete_self', exists (select 1 from pg_policies where schemaname='public' and tablename='rsvps' and cmd='DELETE' and coalesce(qual,'') ilike '%profile_id = auth.uid()%')
union all

-- 6) Indexes and constraints
select 'events_event_datetime_indexed', exists(
  select 1 from pg_indexes where schemaname='public' and tablename='events' and indexdef ilike '%(event_datetime%'
) union all
select 'rsvps_unique_profile_event', exists(
  select 1 from pg_constraint where conrelid='public.rsvps'::regclass and contype='u'
) union all
select 'alerts_confirmations_token_indexed', exists(
  select 1 from pg_indexes where schemaname='public' and tablename='alerts_confirmations' and indexdef ilike '%(token%'
) union all
select 'alerts_subscribers_unique_email', exists(
  select 1 from pg_indexes where schemaname='public' and tablename='alerts_subscribers' and indexdef ilike '%(email%unique%'
) union all
select 'alerts_subscribers_unique_phone', exists(
  select 1 from pg_indexes where schemaname='public' and tablename='alerts_subscribers' and indexdef ilike '%(phone%unique%'
)
union all

-- 7) Admins present
select 'at_least_one_admin', case when to_regclass('public.app_admins') is not null then exists(select 1 from app_admins) else false end;

-- END
