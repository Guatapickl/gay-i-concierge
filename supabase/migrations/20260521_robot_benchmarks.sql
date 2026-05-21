-- Migration: Create robot_benchmarks table, policies, and stats helper

-- Create robot_benchmarks table referencing auth.users(id)
create table if not exists robot_benchmarks (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('anthropic', 'google', 'openai')),
  model_id text not null,
  svg text not null,
  latency_ms integer not null,
  scores jsonb not null,
  average integer not null,
  prompt_used text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table robot_benchmarks enable row level security;

-- Select is allowed for authenticated users to view stats/leaderboard
drop policy if exists "authenticated read benchmarks" on robot_benchmarks;
create policy "authenticated read benchmarks" on robot_benchmarks
  for select to authenticated using (true);

-- Insert is allowed for authenticated users saving their own runs
drop policy if exists "authenticated insert benchmarks" on robot_benchmarks;
create policy "authenticated insert benchmarks" on robot_benchmarks
  for insert to authenticated with check (user_id = auth.uid());

-- Create RPC function to compute aggregates grouped by provider
create or replace function get_provider_stats()
returns table (
  provider text,
  avg_score numeric,
  avg_latency numeric,
  run_count bigint
) as $$
begin
  return query
  select
    r.provider,
    round(avg(r.average), 1) as avg_score,
    round(avg(r.latency_ms), 0) as avg_latency,
    count(*) as run_count
  from robot_benchmarks r
  group by r.provider;
end;
$$ language plpgsql security definer;
