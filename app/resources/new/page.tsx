"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createResource } from '@/lib/resources';

export default function NewResourcePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Add Resource</h2>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          const { data } = await supabase.auth.getUser();
          const uid = data.user?.id;
          if (!uid) {
            setSaving(false);
            setMessage('Please sign in first.');
            return;
          }
          const ok = await createResource({
            owner_user_id: uid,
            url: url.trim(),
            title: title.trim(),
            description: description.trim() || null,
            category: category.trim() || null,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          });
          setSaving(false);
          if (ok) {
            setMessage('✅ Resource created!');
            setTimeout(() => router.push('/resources'), 800);
          } else {
            setMessage('❌ Failed to create resource.');
          }
        }}
      >
        <div className="mb-3">
          <label className="block font-medium mb-1">URL</label>
          <input type="url" className="w-full border px-3 py-2" value={url} onChange={e => setUrl(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Title</label>
          <input type="text" className="w-full border px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Description</label>
          <textarea className="w-full border px-3 py-2" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Category</label>
          <input type="text" className="w-full border px-3 py-2" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Tutorials" />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Tags</label>
          <input type="text" className="w-full border px-3 py-2" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma-separated" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </button>
        {message && <p className="mt-2">{message}</p>}
      </form>
    </div>
  );
}

