"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { currentUser } from '@/lib/firebase/authClient';
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
    <div className="max-w-2xl mx-auto card p-6 md:p-8">
      <h1 className="page-heading mb-6">Add Resource</h1>
      <form
        onSubmit={async e => {
          e.preventDefault();
          setSaving(true);
          setMessage(null);
          const user = await currentUser();
          const uid = user?.uid;
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
            setMessage('Resource created!');
            setTimeout(() => router.push('/resources'), 800);
          } else {
            setMessage('Failed to create resource.');
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
          <input type="text" className="input-field w-full" id="resource-category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Tutorials" />
        </div>
        <div className="mb-4">
          <label htmlFor="resource-tags" className="block text-sm font-medium mb-2">Tags</label>
          <input type="text" className="input-field w-full" id="resource-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma-separated" />
        </div>
        <button type="submit" className="btn-brand" disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </button>
        {message && <p className="mt-2">{message}</p>}
      </form>
    </div>
  );
}

