-- Migration: Allow authenticated users to read all user_profiles (for member directory)
-- Also allows admins to read all profiles. Does NOT allow writing others' profiles.

-- Add a public-read policy for authenticated users on user_profiles
-- This allows the /community directory to list all members.
drop policy if exists "profile public-read" on user_profiles;
create policy "profile public-read" on user_profiles
  for select to authenticated using (true);

-- The existing self-select, self-upsert, self-update policies remain unchanged
-- so users can still only edit their own profiles.
