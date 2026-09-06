"use client";

import { useEffect, useState, useCallback } from 'react';
import { Newspaper } from 'lucide-react';
import { currentUser } from '@/lib/firebase/authClient';
import { getRow } from '@/lib/firebase/db';
import { getFeed } from '@/lib/posts';
import { getUpcomingEvents } from '@/lib/events';
import type { FeedPost, Event } from '@/types/supabase';
import PostComposer from '@/components/feed/PostComposer';
import PostCard from '@/components/feed/PostCard';
import { Alert, LoadingSpinner } from '@/components/ui';

type FeedFilter = 'all' | 'announcements' | 'recaps';

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');

  const refresh = useCallback(async () => {
    const [user, events] = await Promise.all([
      currentUser(),
      getUpcomingEvents(),
    ]);
    const uid = user?.uid || null;
    setUserId(uid);
    setUpcomingEvents(events);

    if (uid) {
      setIsAdmin((await getRow('app_admins', uid)) !== null);
    }

    const feed = await getFeed(uid);
    setPosts(feed);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return <LoadingSpinner text="Loading feed..." className="py-12" />;
  }

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="page-heading mb-4">
          Community feed
        </h1>
        <Alert variant="info">Please sign in to read and post to the feed.</Alert>
      </div>
    );
  }

  const filtered = posts.filter(p => {
    if (filter === 'announcements') return p.is_announcement;
    if (filter === 'recaps') return !!p.event_id;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-heading flex items-center gap-2">

            Community feed
          </h1>
          <p className="text-foreground-muted mt-1">
            Updates, recaps, and announcements from the club
          </p>
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['all', 'announcements', 'recaps'] as FeedFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <PostComposer
        userId={userId}
        isAdmin={isAdmin}
        upcomingEvents={upcomingEvents}
        onPosted={refresh}
      />

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-foreground-muted">No posts to show</p>
          <p className="text-sm text-foreground-subtle mt-1">
            {filter === 'all'
              ? 'Be the first to share something with the club'
              : `No ${filter} yet`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={userId}
              isAdmin={isAdmin}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
