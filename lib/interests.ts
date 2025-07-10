import { supabase } from './supabase';

export type Interest = { id: string; name: string };

export async function fetchInterests(): Promise<Interest[]> {
  const { data, error } = await supabase
    .from('interests')
    .select('id, name')
    .order('name');
  if (error) {
    console.error('Error fetching interests:', error.message);
    return [];
  }
  return data || [];
}

export async function findOrCreateInterest(name: string): Promise<Interest | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data: existing, error: existErr } = await supabase
    .from('interests')
    .select('id, name')
    .eq('name', trimmed);
  if (existErr) {
    console.warn('Interest lookup error:', existErr.message);
  }
  if (existing && existing.length > 0) {
    return existing[0] as Interest;
  }
  const { data: insertData, error: insertErr } = await supabase
    .from('interests')
    .insert({ name: trimmed })
    .select()
    .single();
  if (insertErr || !insertData) {
    console.error('Error inserting new interest:', insertErr?.message);
    return null;
  }
  return insertData as Interest;
}

export async function linkUserInterests(userId: string, interestIds: string[]): Promise<boolean> {
  if (interestIds.length === 0) return true;
  const entries = interestIds.map(id => ({ user_id: userId, interest_id: id }));
  const { error } = await supabase.from('user_interests').insert(entries);
  if (error) {
    console.error('Error linking interests:', error.message);
    return false;
  }
  return true;
}
