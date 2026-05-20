"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Activity, Filter, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getSavedNewsIds, toggleSavedNews } from '@/lib/news';
import type { NewsItem } from '@/types/supabase';
import { Alert, LoadingSpinner } from '@/components/ui';
import NewsCard from '@/components/NewsCard';

export default function NewsFeedPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError && authError.message !== 'Auth session missing!') {
        console.error('Auth error:', authError);
      }
      
      const uid = authData?.user?.id || null;
      setUserId(uid);

      // Fetch from the newly created backend API
      const res = await fetch('/api/news?limit=60');
      if (!res.ok) {
        throw new Error(`Failed to fetch news feed: ${res.status} ${res.statusText}`);
      }
      
      const responseData = await res.json();
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const fetchedItems: NewsItem[] = responseData.data || [];
      setItems(fetchedItems);

      if (uid) {
        const savedNewsSet = await getSavedNewsIds(uid);
        setSaved(savedNewsSet);
      }
    } catch (err: any) {
      console.error('Error loading news feed:', err);
      setError(err.message || 'An unexpected error occurred while loading the neural feeds.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const tags = useMemo(() => {
    const uniqueTags = new Set<string>();
    items.forEach(item => {
      if (item.tag) {
        uniqueTags.add(item.tag);
      }
    });
    return ['All', ...Array.from(uniqueTags).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'All') {
      return items;
    }
    return items.filter(item => item.tag === filter);
  }, [items, filter]);

  const handleToggleSave = async (id: string) => {
    if (!userId) {
      // You could trigger a login modal here
      alert("Please log in to save news articles.");
      return;
    }

    try {
      const isNowSaved = await toggleSavedNews(userId, id);
      setSaved(prev => {
        const nextSet = new Set(prev);
        if (isNowSaved) {
          nextSet.add(id);
        } else {
          nextSet.delete(id);
        }
        return nextSet;
      });
    } catch (err) {
      console.error('Error toggling save status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner text="Synchronizing with The Cortex..." className="py-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Controls Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
        {tags.length > 1 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-foreground-faint">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-widest">Signal Filters</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => {
                const isActive = filter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs transition-all duration-300 border cursor-pointer ${
                      isActive
                        ? 'bg-surface-soft border-primary text-primary-muted font-bold shadow-soft'
                        : 'bg-surface border-border text-foreground-muted hover:text-foreground hover:border-border-strong hover:bg-surface-hover backdrop-blur-sm'
                    }`}
                    style={isActive ? { boxShadow: 'inset 0 0 0 1px rgba(255,45,155,0.15)' } : undefined}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div /> // Spacer
        )}
        
        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border hover:border-border-strong transition-all text-xs font-bold text-foreground-muted hover:text-foreground disabled:opacity-50 shadow-soft cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Sync Feed'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="error" className="border-danger/25 bg-danger/5 text-danger p-5 rounded-xl">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 shrink-0 text-danger mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-danger mb-1">System Anomaly Detected</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* Empty State (No items at all) */}
      {items.length === 0 && !error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-cyan/20 bg-cyan/5 p-8 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-cyan/10 flex items-center justify-center border border-cyan/25">
              <Sparkles className="w-7 h-7 text-cyan" />
            </div>
            <h3 className="text-lg font-bold text-cyan">Awaiting Neural Link</h3>
            <p className="text-sm text-foreground-muted max-w-xl">
              The neural pathways are connected but the feed is currently empty. 
              Once The Cortex completes its next ingestion cycle, high-signal stories will appear here automatically.
            </p>
          </div>
        </motion.div>
      )}

      {/* Feed Grid */}
      <AnimatePresence mode="popLayout">
        {filteredItems.length === 0 && items.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-12 text-center rounded-2xl border border-border bg-surface shadow-soft"
          >
            <Activity className="w-10 h-10 text-foreground-faint mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1.5">No signals detected</h3>
            <p className="text-foreground-muted font-mono text-xs max-w-md mx-auto">
              Adjust your filters. No events or developments matching the current parameters were found in the recent ingestion cycle.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredItems.map(item => (
              <NewsCard 
                key={item.id} 
                item={item} 
                isSaved={saved.has(item.id)} 
                userId={userId} 
                onToggleSave={handleToggleSave} 
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
