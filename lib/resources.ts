import { supabase } from '@/lib/supabase';
import type { Resource } from '@/types/supabase';

export async function getAllResources(): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching resources:', error.message);
    return [];
  }
  return (data || []) as Resource[];
}

export async function getResourceById(id: string): Promise<Resource | null> {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching resource:', error.message);
    return null;
  }
  return data as Resource;
}

export async function createResource(entry: Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'clicks' | 'is_pinned'> & { is_pinned?: boolean } ): Promise<boolean> {
  const { error } = await supabase.from('resources').insert([
    {
      owner_user_id: entry.owner_user_id,
      url: entry.url,
      title: entry.title,
      description: entry.description ?? null,
      category: entry.category ?? null,
      tags: entry.tags ?? null,
      is_pinned: entry.is_pinned ?? false,
    },
  ]);
  if (error) {
    console.error('Failed to insert resource:', error.message);
    return false;
  }
  return true;
}

export async function updateResource(id: string, updates: Partial<Resource>): Promise<boolean> {
  const { error } = await supabase
    .from('resources')
    .update({
      url: updates.url,
      title: updates.title,
      description: updates.description,
      category: updates.category,
      tags: updates.tags,
      is_pinned: updates.is_pinned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    console.error('Failed to update resource:', error.message);
    return false;
  }
  return true;
}

export async function deleteResource(id: string): Promise<boolean> {
  const { error } = await supabase.from('resources').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete resource:', error.message);
    return false;
  }
  return true;
}

