"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Pencil, Tag, Filter, X } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="animate-fade-in">
        <LoadingSpinner text="Loading resources..." className="py-12" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <h1 className="text-display-md font-display font-bold text-foreground mb-4">
          Resources
        </h1>
        <Alert variant="info">
          Please sign in to view and share resources.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md font-display font-bold text-foreground">
            Resources
          </h1>
          <p className="text-foreground-muted mt-1">
            Community guides, tools, and materials
          </p>
        </div>
        <Link href="/resources/new">
          <Button variant="primary" size="md">
            <Plus className="w-4 h-4" />
            Add Resource
          </Button>
        </Link>
      </div>

      {/* Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-foreground-subtle" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                !category
                  ? 'bg-primary text-background'
                  : 'bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-foreground-subtle'
              }`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  category === c
                    ? 'bg-primary text-background'
                    : 'bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-foreground-subtle'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {category && (
            <button
              onClick={() => setCategory('')}
              className="p-1.5 text-foreground-subtle hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Resources List */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-foreground-muted">No resources found</p>
          <p className="text-sm text-foreground-subtle mt-1">
            Be the first to add a resource
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map(r => (
            <li key={r.id} className="card p-5 hover:border-primary/30 transition-all duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2"
                  >
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {r.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-foreground-subtle group-hover:text-primary transition-colors" />
                  </a>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-foreground-muted">
                    {r.category && (
                      <span className="badge">{r.category}</span>
                    )}
                    {r.tags && r.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {r.tags.join(', ')}
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-sm text-foreground-muted mt-3 line-clamp-2">
                      {r.description}
                    </p>
                  )}
                </div>

                {(isAdmin || r.owner_user_id === userId) && (
                  <Link
                    href={`/resources/${r.id}/edit`}
                    className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-primary transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
