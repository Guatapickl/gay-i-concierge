import { supabase } from './supabase';
import type { Post, PostComment, FeedPost, ChatChannel } from '@/types/supabase';

/**
 * Fetch the newsfeed: posts ordered with pinned first then newest,
 * hydrated with author name, comment counts, reactions, and linked event preview.
 *
 * Pass `channel` to filter to a single Communication Hub channel; pass
 * `nullChannelOnly=true` for legacy member-feed posts that predate channels.
 */
export async function getFeed(
  currentUserId: string | null,
  limit = 50,
  options: { channel?: string; nullChannelOnly?: boolean } = {},
): Promise<FeedPost[]> {
  let query = supabase
    .from('posts')
    .select('*, events(id, title, event_datetime)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.channel) {
    query = query.eq('channel', options.channel);
  } else if (options.nullChannelOnly) {
    query = query.is('channel', null);
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('Failed to fetch feed:', error.message);
    return [];
  }
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map(p => p.id);
  const authorIds = Array.from(new Set(posts.map(p => p.author_user_id)));

  const [profilesRes, commentCountsRes, reactionsRes] = await Promise.all([
    supabase.from('user_profiles').select('id, full_name').in('id', authorIds),
    supabase.from('post_comments').select('post_id').in('post_id', postIds),
    supabase.from('post_reactions').select('post_id, user_id, emoji').in('post_id', postIds),
  ]);

  const nameById = new Map<string, string | null>(
    (profilesRes.data || []).map(p => [p.id as string, (p.full_name as string | null) ?? null])
  );

  const commentCounts = new Map<string, number>();
  for (const row of commentCountsRes.data || []) {
    const key = row.post_id as string;
    commentCounts.set(key, (commentCounts.get(key) || 0) + 1);
  }

  // Aggregate reactions: { postId -> { emoji -> {count, mine} } }
  const reactionsByPost = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of reactionsRes.data || []) {
    const postId = row.post_id as string;
    const emoji = row.emoji as string;
    const userId = row.user_id as string;
    if (!reactionsByPost.has(postId)) reactionsByPost.set(postId, new Map());
    const inner = reactionsByPost.get(postId)!;
    const current = inner.get(emoji) || { count: 0, mine: false };
    current.count += 1;
    if (userId === currentUserId) current.mine = true;
    inner.set(emoji, current);
  }

  return posts.map(p => {
    const reactions = reactionsByPost.get(p.id as string) || new Map();
    const reactionList = Array.from(reactions.entries())
      .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
      .sort((a, b) => b.count - a.count);
    return {
      id: p.id,
      author_user_id: p.author_user_id,
      title: p.title,
      body: p.body,
      event_id: p.event_id,
      is_announcement: p.is_announcement,
      is_pinned: p.is_pinned,
      created_at: p.created_at,
      updated_at: p.updated_at,
      author_name: nameById.get(p.author_user_id) || null,
      comment_count: commentCounts.get(p.id as string) || 0,
      reactions: reactionList,
      event: p.events
        ? {
            id: p.events.id,
            title: p.events.title,
            event_datetime: p.events.event_datetime,
          }
        : null,
    } as FeedPost;
  });
}

export async function createPost(args: {
  authorUserId: string;
  title?: string | null;
  body: string;
  eventId?: string | null;
  channel?: string | null;
  isAnnouncement?: boolean;
  isPinned?: boolean;
}): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_user_id: args.authorUserId,
      title: args.title?.trim() || null,
      body: args.body.trim(),
      event_id: args.eventId || null,
      channel: args.channel || null,
      is_announcement: args.isAnnouncement || false,
      is_pinned: args.isPinned || false,
    })
    .select()
    .single();
  if (error) {
    console.error('Failed to create post:', error.message);
    return null;
  }
  return data as Post;
}

export async function getChatChannels(): Promise<ChatChannel[]> {
  const { data, error } = await supabase
    .from('chat_channels')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('Failed to load channels:', error.message);
    return [];
  }
  return (data || []) as ChatChannel[];
}

export async function getChannelUnreadCounts(
  userId: string,
  sinceIso: string,
): Promise<Record<string, number>> {
  // Tally posts per channel created after `sinceIso` and not authored by the user.
  const { data, error } = await supabase
    .from('posts')
    .select('channel')
    .gt('created_at', sinceIso)
    .neq('author_user_id', userId)
    .not('channel', 'is', null);
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    const ch = (row.channel as string | null) ?? '';
    if (!ch) continue;
    counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

export async function getRecentlyActiveAuthors(
  channel: string,
  withinHours = 24 * 7,
  limit = 5,
): Promise<{ user_id: string; full_name: string | null }[]> {
  const sinceIso = new Date(Date.now() - withinHours * 3600 * 1000).toISOString();
  const { data: rows } = await supabase
    .from('posts')
    .select('author_user_id, created_at')
    .eq('channel', channel)
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(50);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const r of rows || []) {
    const id = r.author_user_id as string;
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
      if (ordered.length >= limit) break;
    }
  }
  if (ordered.length === 0) return [];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', ordered);
  const nameById = new Map<string, string | null>(
    (profiles || []).map(p => [p.id as string, (p.full_name as string | null) ?? null]),
  );
  return ordered.map(id => ({ user_id: id, full_name: nameById.get(id) ?? null }));
}

export async function deletePost(postId: string): Promise<boolean> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) {
    console.error('Failed to delete post:', error.message);
    return false;
  }
  return true;
}

export async function getComments(postId: string): Promise<(PostComment & { author_name: string | null })[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to fetch comments:', error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  const authorIds = Array.from(new Set(data.map(c => c.author_user_id)));
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', authorIds);
  const nameById = new Map<string, string | null>(
    (profiles || []).map(p => [p.id as string, (p.full_name as string | null) ?? null])
  );

  return data.map(c => ({
    ...(c as PostComment),
    author_name: nameById.get(c.author_user_id) || null,
  }));
}

export async function createComment(args: {
  postId: string;
  authorUserId: string;
  body: string;
}): Promise<PostComment | null> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: args.postId,
      author_user_id: args.authorUserId,
      body: args.body.trim(),
    })
    .select()
    .single();
  if (error) {
    console.error('Failed to create comment:', error.message);
    return null;
  }
  return data as PostComment;
}

export async function toggleReaction(args: {
  postId: string;
  userId: string;
  emoji: string;
}): Promise<boolean> {
  // Try delete first (toggle off); if no row deleted, insert.
  const { data: deleted } = await supabase
    .from('post_reactions')
    .delete()
    .match({ post_id: args.postId, user_id: args.userId, emoji: args.emoji })
    .select();
  if (deleted && deleted.length > 0) return true;

  const { error } = await supabase.from('post_reactions').insert({
    post_id: args.postId,
    user_id: args.userId,
    emoji: args.emoji,
  });
  if (error) {
    console.error('Failed to toggle reaction:', error.message);
    return false;
  }
  return true;
}
