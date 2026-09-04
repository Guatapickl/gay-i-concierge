import { supabase } from './supabase';

/** Client-side admin check mirroring the `is_admin()` SQL function. */
export async function isCurrentUserAdmin(userId?: string | null): Promise<boolean> {
  let uid = userId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data.user?.id ?? null;
  }
  if (!uid) return false;
  const { count } = await supabase
    .from('app_admins')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', uid);
  return !!count && count > 0;
}
