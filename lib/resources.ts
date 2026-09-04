import { addDoc, deleteDoc, orderBy, updateDoc } from 'firebase/firestore';
import { col, getRow, listRows, nowIso, payloadOf, ref } from '@/lib/firebase/db';
import type { Resource } from '@/types/supabase';

export async function getAllResources(): Promise<Resource[]> {
  try {
    return await listRows<Resource>('resources', orderBy('is_pinned', 'desc'), orderBy('created_at', 'desc'));
  } catch (err) {
    console.error('Error fetching resources:', (err as Error).message);
    return [];
  }
}

export async function getResourceById(id: string): Promise<Resource | null> {
  try {
    return await getRow<Resource>('resources', id);
  } catch (err) {
    console.error('Error fetching resource:', (err as Error).message);
    return null;
  }
}

export async function createResource(entry: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'clicks' | 'is_pinned'> & { is_pinned?: boolean } ): Promise<boolean> {
  try {
    await addDoc(col('resources'), payloadOf({
      owner_user_id: entry.owner_user_id,
      url: entry.url,
      title: entry.title,
      description: entry.description ?? null,
      category: entry.category ?? null,
      tags: entry.tags ?? null,
      is_pinned: entry.is_pinned ?? false,
      clicks: 0,
      created_at: nowIso(),
      updated_at: null,
    }));
    return true;
  } catch (err) {
    console.error('Failed to insert resource:', (err as Error).message);
    return false;
  }
}

export async function updateResource(id: string, updates: Partial<Resource>): Promise<boolean> {
  try {
    // payloadOf drops undefined keys, so only supplied fields are written.
    await updateDoc(ref('resources', id), payloadOf({
      url: updates.url,
      title: updates.title,
      description: updates.description,
      category: updates.category,
      tags: updates.tags,
      is_pinned: updates.is_pinned,
      updated_at: nowIso(),
    }));
    return true;
  } catch (err) {
    console.error('Failed to update resource:', (err as Error).message);
    return false;
  }
}

export async function deleteResource(id: string): Promise<boolean> {
  try {
    await deleteDoc(ref('resources', id));
    return true;
  } catch (err) {
    console.error('Failed to delete resource:', (err as Error).message);
    return false;
  }
}
