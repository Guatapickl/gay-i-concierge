import { supabase } from './supabase';
import type { AgendaSuggestion } from '@/types/supabase';

/**
 * Suggestions for a specific event, or (eventId = null) the general
 * "next meeting" pool. Vote counts and the caller's own vote are attached.
 */
export async function getSuggestions(eventId: string | null): Promise<AgendaSuggestion[]> {
  let q = supabase.from('agenda_suggestions').select('*').order('created_at', { ascending: true });
  q = eventId ? q.eq('event_id', eventId) : q.is('event_id', null);
  const [{ data, error }, { data: userRes }] = await Promise.all([q, supabase.auth.getUser()]);
  if (error) {
    console.error('Error fetching suggestions:', error.message);
    return [];
  }
  const rows = (data || []) as AgendaSuggestion[];
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const { data: votes } = await supabase
    .from('agenda_suggestion_votes')
    .select('suggestion_id, user_id')
    .in('suggestion_id', ids);
  const me = userRes.user?.id;
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes || []) {
    counts.set(v.suggestion_id, (counts.get(v.suggestion_id) || 0) + 1);
    if (me && v.user_id === me) mine.add(v.suggestion_id);
  }
  return rows
    .map(r => ({ ...r, vote_count: counts.get(r.id) || 0, voted_by_me: mine.has(r.id) }))
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
}

export async function addSuggestion(args: {
  eventId: string | null;
  title: string;
  notes: string | null;
}): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return false;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const authorName = profile?.full_name || user.email?.split('@')[0] || null;
  const { error } = await supabase.from('agenda_suggestions').insert({
    event_id: args.eventId,
    user_id: user.id,
    author_name: authorName,
    title: args.title,
    notes: args.notes,
  });
  if (error) {
    console.error('Failed to add suggestion:', error.message);
    return false;
  }
  return true;
}

export async function toggleSuggestionVote(suggestionId: string, currentlyVoted: boolean): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { error } = currentlyVoted
    ? await supabase
        .from('agenda_suggestion_votes')
        .delete()
        .eq('suggestion_id', suggestionId)
        .eq('user_id', uid)
    : await supabase.from('agenda_suggestion_votes').insert({ suggestion_id: suggestionId, user_id: uid });
  if (error) {
    console.error('Failed to toggle suggestion vote:', error.message);
    return false;
  }
  return true;
}

export async function setSuggestionStatus(
  suggestionId: string,
  status: AgendaSuggestion['status']
): Promise<boolean> {
  const { error } = await supabase.from('agenda_suggestions').update({ status }).eq('id', suggestionId);
  if (error) {
    console.error('Failed to update suggestion:', error.message);
    return false;
  }
  return true;
}

export async function deleteSuggestion(suggestionId: string): Promise<boolean> {
  const { error } = await supabase.from('agenda_suggestions').delete().eq('id', suggestionId);
  if (error) {
    console.error('Failed to delete suggestion:', error.message);
    return false;
  }
  return true;
}
