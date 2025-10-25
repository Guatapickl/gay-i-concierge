import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazily create the service-role client to avoid requiring the key at build time.
// Do NOT import this in client components.
let cached: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin env vars missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set server-side.');
  }
  cached = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
