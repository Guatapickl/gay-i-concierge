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
            <li key={r.id} className="glass-card p-6 rounded-xl border border-white/10 hover:border-primary/30 transition-all duration-300 group hover:shadow-[0_0_30px_rgba(255,0,204,0.2)] relative overflow-hidden">
              {/* Animated background glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold font-orbitron mb-3 group-hover:text-primary transition-colors">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors inline-block"
                      >
                        {r.title}
                      </a>
                    </h3>

                    <div className="space-y-2 mb-4 text-gray-300">
                      {r.category && (
                        <p className="flex items-center gap-2">
                          <span className="text-accent font-orbitron text-sm">CATEGORY:</span>
                          <span className="text-white">{r.category}</span>
                        </p>
                      )}
                      {r.tags && r.tags.length > 0 && (
                        <p className="flex items-center gap-2">
                          <span className="text-accent font-orbitron text-sm">TAGS:</span>
                          <span className="text-white text-sm opacity-80">{r.tags.join(', ')}</span>
                        </p>
                      )}
                    </div>

                    {r.description && (
                      <p className="text-gray-400 mb-4 leading-relaxed whitespace-pre-line">
                        {r.description}
                      </p>
                    )}
                  </div>

                  {(isAdmin || r.owner_user_id === userId) && (
                    <Link
                      href={`/resources/${r.id}/edit`}
                      className="text-sm text-primary hover:text-accent underline font-orbitron tracking-wide transition-colors shrink-0"
                    >
                      EDIT
                    </Link>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-2 text-sm font-bold uppercase tracking-wider text-center bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded transition-all duration-300"
                  >
                    Visit Resource
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

