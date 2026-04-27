"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getChatChannels,
  getFeed,
  createPost,
  getChannelUnreadCounts,
  getRecentlyActiveAuthors,
} from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { ChatChannel, FeedPost } from '@/types/supabase';
import PostCard from '@/components/feed/PostCard';
import { Alert, FormTextarea, LoadingSpinner } from '@/components/ui';

const LAST_VISITED_KEY = 'gic.chat.lastVisited';

const FALLBACK_CHANNELS: ChatChannel[] = [
  { id: 'general',  name: '# general',         description: null, sort_order: 1, is_archived: false, created_at: '' },
  { id: 'models',   name: '# model-releases',  description: null, sort_order: 2, is_archived: false, created_at: '' },
  { id: 'events',   name: '# events',          description: null, sort_order: 3, is_archived: false, created_at: '' },
  { id: 'papers',   name: '# paper-club',      description: null, sort_order: 4, is_archived: false, created_at: '' },
  { id: 'random',   name: '# off-topic',       description: null, sort_order: 5, is_archived: false, created_at: '' },
];

const COLOR_FOR_USER = (id: string) => {
  const palette = ['#e0007a', '#7c3aed', '#0099cc', '#007a4a', '#c05200', '#ff2d9b', '#7c2fff', '#008ab5'];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};

export default function CommunicationHubPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [channels, setChannels] = useState<ChatChannel[]>(FALLBACK_CHANNELS);
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [active, setActive] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastVisited = useMemo(() => {
    if (typeof window === 'undefined') return new Date(Date.now() - 7 * 86_400_000).toISOString();
    const raw = window.localStorage.getItem(LAST_VISITED_KEY);
    return raw || new Date(Date.now() - 7 * 86_400_000).toISOString();
  }, []);

  // Bootstrap: auth, channels, unread tallies
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
        const counts = await getChannelUnreadCounts(uid, lastVisited);
        setUnread(counts);
      }
      const ch = await getChatChannels();
      if (ch.length > 0) setChannels(ch);
    })();
  }, [lastVisited]);

  // Per-channel: load posts + active authors
  const loadChannel = useCallback(async (channel: string, uid: string | null) => {
    setLoading(true);
    const [feed, recent] = await Promise.all([
      getFeed(uid, 50, { channel }),
      getRecentlyActiveAuthors(channel),
    ]);
    setPosts(feed);
    setActive(recent);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChannel(activeChannel, userId);
  }, [activeChannel, userId, loadChannel]);

  // Update "lastVisited" when leaving so unread counts re-anchor
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_VISITED_KEY, new Date().toISOString());
      }
    };
  }, []);

  const submit = async () => {
    if (!body.trim() || !userId) return;
    setSubmitting(true);
    setError(null);
    const post = await createPost({
      authorUserId: userId,
      body,
      channel: activeChannel,
    });
    setSubmitting(false);
    if (!post) {
      setError('Failed to post. Are you signed in?');
      return;
    }
    setBody('');
    loadChannel(activeChannel, userId);
  };

  const channelMeta = channels.find(c => c.id === activeChannel);

  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Alert variant="info">
          Please <Link href="/auth/sign-in" className="underline">sign in</Link> to join the
          conversation.
        </Alert>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] rounded-xl overflow-hidden border-[1.5px] border-border bg-surface min-h-[560px] animate-fade-in">
      {/* Sidebar */}
      <aside className="bg-surface-elevated border-b md:border-b-0 md:border-r border-border py-5 flex flex-col">
        <div className="px-4 pb-4 text-[12px] font-extrabold text-primary-muted tracking-[0.14em] font-display">
          GAY I CLUB NYC
        </div>
        <div className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-foreground-faint tracking-[0.15em] font-mono">
          CHANNELS
        </div>
        {channels.map(ch => {
          const isActive = activeChannel === ch.id;
          const u = unread[ch.id] || 0;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-4 py-1.5 text-sm flex items-center justify-between transition-colors text-left ${
                isActive
                  ? 'bg-surface-soft text-foreground font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
              style={
                isActive
                  ? { borderLeft: '2px solid #ff2d9b' }
                  : { borderLeft: '2px solid transparent' }
              }
            >
              <span>{ch.name}</span>
              {u > 0 && !isActive && (
                <span className="bg-primary text-white rounded-full text-[10px] font-bold px-1.5 py-0.5">
                  {u > 99 ? '99+' : u}
                </span>
              )}
            </button>
          );
        })}
        <div className="px-4 pt-4 pb-1.5 text-[10px] font-bold text-foreground-faint tracking-[0.15em] font-mono">
          ACTIVE THIS WEEK
        </div>
        {active.length === 0 ? (
          <div className="px-4 py-1 text-[12px] text-foreground-faint">No activity yet</div>
        ) : (
          active.map(u => (
            <div key={u.user_id} className="flex items-center gap-2 px-4 py-1">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ background: COLOR_FOR_USER(u.user_id) }}
              />
              <span className="text-[13px] text-foreground-muted truncate">
                {u.full_name || 'Member'}
              </span>
            </div>
          ))
        )}
      </aside>

      {/* Main pane */}
      <section className="flex flex-col min-w-0 bg-surface">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-foreground">{channelMeta?.name}</span>
            {channelMeta?.description && (
              <p className="text-[12px] text-foreground-subtle">{channelMeta.description}</p>
            )}
          </div>
          <span className="text-[13px] text-foreground-subtle">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4 max-h-[60vh]">
          {loading ? (
            <LoadingSpinner text="Loading channel..." className="py-10" />
          ) : posts.length === 0 ? (
            <p className="text-foreground-faint text-center pt-12">
              No posts in {channelMeta?.name} yet — say hi!
            </p>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
                isAdmin={isAdmin}
                onChanged={() => loadChannel(activeChannel, userId)}
              />
            ))
          )}
        </div>

        {/* Composer */}
        <div className="px-4 md:px-6 py-3 border-t border-border space-y-2">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <div className="flex gap-2.5">
            <FormTextarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Post to ${channelMeta?.name}… (⌘↵ to send)`}
              rows={2}
              className="flex-1"
            />
            <button
              onClick={submit}
              disabled={!body.trim() || submitting}
              className="btn-brand self-end"
            >
              {submitting ? '…' : 'Post'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
