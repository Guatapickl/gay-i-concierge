-- Create the suggestions table
create table public.suggestions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  title text not null,
  description text not null,
  type text not null check (type in ('feature', 'bug')),
  model_requested text,
  custom_prompt text,
  status text default 'pending' check (status in ('pending', 'approved', 'in_progress', 'completed', 'rejected')),
  upvotes integer default 0
);

-- Enable RLS
alter table public.suggestions enable row level security;

-- Policies
create policy "Enable read access for all users"
on public.suggestions for select
using (true);

create policy "Enable insert for authenticated users only"
on public.suggestions for insert
with check (auth.uid() = user_id);

create policy "Enable update for users based on id"
on public.suggestions for update
using (auth.uid() = user_id);

-- Create upvotes table to track user votes
create table public.suggestion_upvotes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  suggestion_id uuid references public.suggestions not null,
  unique(user_id, suggestion_id)
);

alter table public.suggestion_upvotes enable row level security;

create policy "Enable read access for all users"
on public.suggestion_upvotes for select
using (true);

create policy "Enable insert for authenticated users only"
on public.suggestion_upvotes for insert
with check (auth.uid() = user_id);

create policy "Enable delete for users based on id"
on public.suggestion_upvotes for delete
using (auth.uid() = user_id);
