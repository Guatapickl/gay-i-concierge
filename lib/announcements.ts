import { addDoc, deleteDoc, limit as qLimit, orderBy, updateDoc } from 'firebase/firestore';
import { col, listRows, nowIso, payloadOf, ref } from './firebase/db';
import type { Announcement } from '@/types/supabase';

export async function getAnnouncements(limit = 100): Promise<Announcement[]> {
  try {
    return await listRows<Announcement>('announcements', orderBy('created_at', 'desc'), qLimit(limit));
  } catch (err) {
    console.error('Failed to fetch announcements:', (err as Error).message);
    return [];
  }
}

export async function createAnnouncement(args: {
  authorUserId: string;
  title: string;
  body: string;
}): Promise<Announcement | null> {
  const now = nowIso();
  const row: Omit<Announcement, 'id'> = {
    author_user_id: args.authorUserId,
    title: args.title.trim(),
    body: args.body.trim(),
    created_at: now,
    updated_at: now,
  };
  try {
    const d = await addDoc(col('announcements'), payloadOf(row));
    return { id: d.id, ...row };
  } catch (err) {
    console.error('Failed to create announcement:', (err as Error).message);
    return null;
  }
}

export async function updateAnnouncement(
  announcementId: string,
  args: { title: string; body: string },
): Promise<boolean> {
  try {
    await updateDoc(ref('announcements', announcementId), payloadOf({
      title: args.title.trim(),
      body: args.body.trim(),
      updated_at: nowIso(),
    }));
    return true;
  } catch (err) {
    console.error('Failed to update announcement:', (err as Error).message);
    return false;
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  try {
    await deleteDoc(ref('announcements', announcementId));
    return true;
  } catch (err) {
    console.error('Failed to delete announcement:', (err as Error).message);
    return false;
  }
}
