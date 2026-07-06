import { supabase } from './supabase';
import type { Announcement } from '@/types/supabase';

export async function getAnnouncements(limit = 100): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch announcements:', error.message);
    return [];
  }

  return (data || []) as Announcement[];
}

export async function createAnnouncement(args: {
  authorUserId: string;
  title: string;
  body: string;
}): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      author_user_id: args.authorUserId,
      title: args.title.trim(),
      body: args.body.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create announcement:', error.message);
    return null;
  }

  return data as Announcement;
}

export async function updateAnnouncement(
  announcementId: string,
  args: { title: string; body: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('announcements')
    .update({
      title: args.title.trim(),
      body: args.body.trim(),
    })
    .eq('id', announcementId);

  if (error) {
    console.error('Failed to update announcement:', error.message);
    return false;
  }

  return true;
}

export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) {
    console.error('Failed to delete announcement:', error.message);
    return false;
  }

  return true;
}
