"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { currentUser } from '@/lib/firebase/authClient';
import { getRow } from '@/lib/firebase/db';
import { getResourceById, updateResource, deleteResource } from '@/lib/resources';
import type { Resource } from '@/types/supabase';

export default function EditResourcePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [resource, setResource] = useState<Resource | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await getResourceById(id);
      setResource(r);
      if (r) {
        setUrl(r.url || '');
        setTitle(r.title || '');
        setDescription(r.description || '');
        setCategory(r.category || '');
        setTags((r.tags || []).join(', '));
        setIsPinned(!!r.is_pinned);
      }
      const user = await currentUser();
      const uid = user?.uid || null;
      setUserId(uid);
      if (uid) {
        setIsAdmin((await getRow('app_admins', uid)) !== null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (!id) return <div>Missing resource ID.</div>;
  if (loading) return <div>Loading…</div>;
  if (!resource) return <div>Resource not found.</div>;
  if (!(isAdmin || resource.owner_user_id === userId)) return <div>You do not have permission to edit this.</div>;

  return (
    <div className="max-w-2xl mx-auto card p-6 md:p-8">
      <h1 className="page-heading mb-6">Edit Resource</h1>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          const ok = await updateResource(id, {
            url: url.trim(),
            title: title.trim(),
            description: description.trim() || null,
            category: category.trim() || null,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            is_pinned: isAdmin ? isPinned : resource.is_pinned,
          });
          setSaving(false);
          if (ok) {
            setMessage('Updated');
            setTimeout(() => router.push('/resources'), 800);
          } else {
            setMessage('Failed to update');
          }
        }}
      >
        <div className="mb-3">
          <label htmlFor="resource-url" className="block text-sm font-medium mb-2">URL</label>
          <input type="url" className="input-field w-full" id="resource-url" value={url} onChange={e => setUrl(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label htmlFor="resource-title" className="block text-sm font-medium mb-2">Title</label>
          <input type="text" className="input-field w-full" id="resource-title" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label htmlFor="resource-description" className="block text-sm font-medium mb-2">Description</label>
          <textarea className="input-field w-full" rows={3} id="resource-description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="mb-3">
          <label htmlFor="resource-category" className="block text-sm font-medium mb-2">Category</label>
          <input type="text" className="input-field w-full" id="resource-category" value={category} onChange={e => setCategory(e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="resource-tags" className="block text-sm font-medium mb-2">Tags</label>
          <input type="text" className="input-field w-full" id="resource-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma-separated" />
        </div>
        {isAdmin && (
          <div className="mb-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
              <span>Pin resource</span>
            </label>
          </div>
        )}
        <button type="submit" className="btn-brand" disabled={saving}>
          {saving ? 'Saving…' : 'Update'}
        </button>
        <button
          type="button"
          className="btn-secondary text-danger ml-2"
          onClick={async () => {
            if (!confirm('Delete this resource?')) return;
            setSaving(true);
            setMessage(null);
            const ok = await deleteResource(id);
            setSaving(false);
            if (ok) {
              setMessage('Deleted');
              setTimeout(() => router.push('/resources'), 800);
            } else {
              setMessage('Failed to delete');
            }
          }}
        >
          Delete
        </button>
        {message && <p className="mt-2">{message}</p>}
      </form>
    </div>
  );
}

