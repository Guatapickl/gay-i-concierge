"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getAllResources } from '@/lib/resources';
import type { Resource } from '@/types/supabase';
import { Button, Alert, LoadingSpinner } from '@/components/ui';

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;
      setUserId(uid);
      if (uid) {
        const { count } = await supabase
          .from('app_admins')
          .select('user_id', { count: 'exact', head: true })
          .eq('user_id', uid);
        setIsAdmin(!!count && count > 0);
      }
      const data = await getAllResources();
      setResources(data);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach(r => { if (r.category) set.add(r.category); });
    return Array.from(set).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    return category ? resources.filter(r => r.category === category) : resources;
  }, [resources, category]);

  if (loading) return <LoadingSpinner text="Loading resources..." className="mt-8" />;

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Resource Library</h2>
        <Alert variant="info">
          Please sign in to view and share resources.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Resource Library</h2>
        <Link href="/resources/new">
          <Button variant="success" size="md">+ Add Resource</Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm">Filter by category:</label>
        <select className="border px-2 py-1 bg-white text-black rounded" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {category && (
          <Button variant="ghost" size="sm" onClick={() => setCategory('')}>Clear</Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-400 italic">No resources found.</div>
      ) : (
        <ul className="space-y-4">
          {filtered.map(r => (
            <li key={r.id} className="border rounded p-4 bg-gray-900/40">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold underline">
                    {r.title}
                  </a>
                  {r.category && (
                    <div className="mt-1 text-xs text-gray-400">Category: {r.category}</div>
                  )}
                  {r.tags && r.tags.length > 0 && (
                    <div className="mt-1 text-xs text-gray-400">Tags: {r.tags.join(', ')}</div>
                  )}
                  {r.description && (
                    <p className="mt-2 text-sm whitespace-pre-line">{r.description}</p>
                  )}
                </div>
                {(isAdmin || r.owner_user_id === userId) && (
                  <Link href={`/resources/${r.id}/edit`} className="text-sm text-blue-400 underline ml-auto">Edit</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

