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
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-xs font-mono font-semibold tracking-wider uppercase">Live Feed</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 flex items-center gap-4">
              <Sparkles className="w-10 h-10 text-primary shrink-0" />
              Curated Cortex
            </h1>
            <p className="text-gray-400 max-w-2xl text-base md:text-lg mt-2">
              High-signal, AI-summarized developments from across the ecosystem, personalized exclusively for the Gay-I Club.
            </p>
          </div>
          
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium text-gray-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Sync Feed'}
          </button>
        </header>

        {/* Error State */}
        {error && (
          <Alert variant="error" className="border-red-500/40 bg-red-500/10 text-red-300 p-6 rounded-xl">
            <div className="flex items-start gap-3">
              <Activity className="w-6 h-6 shrink-0 text-red-400 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-1">System Anomaly Detected</h3>
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
            className="border border-blue-500/30 bg-blue-500/10 p-8 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex flex-col items-center text-center gap-4 relative z-10">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-blue-300">Awaiting Neural Link</h3>
              <p className="text-base text-blue-200 max-w-xl">
                The neural pathways are connected but the feed is currently empty. 
                Once The Cortex completes its next ingestion cycle, high-signal stories will appear here automatically.
              </p>
            </div>
          </motion.div>
        )}

        {/* Filters Section */}
        {tags.length > 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-mono uppercase tracking-widest">Signal Filters</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {tags.map(t => {
                const isActive = filter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-5 py-2 rounded-xl text-sm transition-all duration-300 border ${
                      isActive
                        ? 'bg-primary/20 border-primary text-white font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/10 backdrop-blur-sm'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feed Grid */}
        <AnimatePresence mode="popLayout">
          {filteredItems.length === 0 && items.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-16 text-center rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm"
            >
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No signals detected</h3>
              <p className="text-gray-500 font-mono text-sm max-w-md mx-auto">
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
    </div>
  );
}
