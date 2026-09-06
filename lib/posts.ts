import { addDoc, deleteDoc, getDoc, getDocs, limit as qLimit, orderBy, query, setDoc, Timestamp, where, type QueryConstraint } from 'firebase/firestore';
import { chunk, col, listRows, nowIso, payloadOf, ref, rowOf, toIso } from './firebase/db';
import { getMemberProfile } from './directory';
import type { Post, PostComment, FeedPost, ChatChannel, Event } from '@/types/supabase';

/** post_reactions doc id — mirrors the Postgres (post_id, user_id, emoji) unique key. */
export function reactionDocId(postId: string, userId: string, emoji: string) {
  return `${postId}_${userId}_${emoji}`;
}

/** user_profiles/{uid}.full_name for a set of uids. Never throws (rules may hide profiles). */
async function namesByIds(ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  await Promise.all(
    unique.map(async id => {
      try {
        const profile = await getMemberProfile(id);
        out.set(id, profile?.full_name ?? null);
      } catch {
        out.set(id, null);
      }
    }),
  );
  return out;
}

async function rowsByIn<T>(name: string, field: string, values: string[], ...rest: QueryConstraint[]): Promise<T[]> {
  const out: T[] = [];
  for (const part of chunk(Array.from(new Set(values)))) {
    const snap = await getDocs(query(col(name), where(field, 'in', part), ...rest));
    snap.docs.forEach(d => out.push(rowOf<T>(d)));
  }
  return out;
}

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
  const constraints: QueryConstraint[] = [];
  if (options.channel) constraints.push(where('channel', '==', options.channel));
  else if (options.nullChannelOnly) constraints.push(where('channel', '==', null));
  constraints.push(orderBy('is_pinned', 'desc'), orderBy('created_at', 'desc'), qLimit(limit));

  let posts: Post[];
  try {
    posts = await listRows<Post>('posts', ...constraints);
  } catch (err) {
    console.error('Failed to fetch feed:', (err as Error).message);
    return [];
  }
  if (posts.length === 0) return [];

  const postIds = posts.map(p => p.id);
  const authorIds = Array.from(new Set(posts.map(p => p.author_user_id)));
  const eventIds = Array.from(new Set(posts.map(p => p.event_id).filter((x): x is string => !!x)));

  const [nameById, comments, reactions, events] = await Promise.all([
    namesByIds(authorIds),
    rowsByIn<{ post_id: string }>('post_comments', 'post_id', postIds).catch(() => []),
    rowsByIn<{ post_id: string; user_id: string; emoji: string }>('post_reactions', 'post_id', postIds).catch(() => []),
    rowsByIn<Event>('events', '__name__', eventIds).catch(() => [] as Event[]),
  ]);

  const commentCounts = new Map<string, number>();
  for (const row of comments) {
    commentCounts.set(row.post_id, (commentCounts.get(row.post_id) || 0) + 1);
  }

  // Aggregate reactions: { postId -> { emoji -> {count, mine} } }
  const reactionsByPost = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const row of reactions) {
    if (!reactionsByPost.has(row.post_id)) reactionsByPost.set(row.post_id, new Map());
    const inner = reactionsByPost.get(row.post_id)!;
    const current = inner.get(row.emoji) || { count: 0, mine: false };
    current.count += 1;
    if (row.user_id === currentUserId) current.mine = true;
    inner.set(row.emoji, current);
  }

  const eventById = new Map(events.map(e => [e.id, e]));

  return posts.map(p => {
    const reactionMap = reactionsByPost.get(p.id) || new Map();
    const reactionList = Array.from(reactionMap.entries())
      .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
      .sort((a, b) => b.count - a.count);
    const ev = p.event_id ? eventById.get(p.event_id) : undefined;
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
      comment_count: commentCounts.get(p.id) || 0,
      reactions: reactionList,
      event: ev ? { id: ev.id, title: ev.title, event_datetime: ev.event_datetime } : null,
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
  const now = nowIso();
  const row: Omit<Post, 'id'> = {
    author_user_id: args.authorUserId,
    title: args.title?.trim() || null,
    body: args.body.trim(),
    event_id: args.eventId || null,
    channel: args.channel || null,
    is_announcement: args.isAnnouncement || false,
    is_pinned: args.isPinned || false,
    created_at: now,
    updated_at: now,
  };
  try {
    const d = await addDoc(col('posts'), payloadOf(row));
    return { id: d.id, ...row };
  } catch (err) {
    console.error('Failed to create post:', (err as Error).message);
    return null;
  }
}

export async function getChatChannels(): Promise<ChatChannel[]> {
  try {
    const rows = await listRows<ChatChannel>('chat_channels', where('is_archived', '==', false));
    return rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  } catch (err) {
    console.error('Failed to load channels:', (err as Error).message);
    return [];
  }
}

export async function getChannelUnreadCounts(
  userId: string,
  sinceIso: string,
): Promise<Record<string, number>> {
  // Tally posts per channel created after `sinceIso` and not authored by the user.
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return {};
  let rows: Post[];
  try {
    rows = await listRows<Post>('posts', where('created_at', '>', Timestamp.fromDate(since)));
  } catch {
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.author_user_id === userId) continue;
    const ch = row.channel ?? '';
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
  const since = new Date(Date.now() - withinHours * 3600 * 1000);
  let rows: Post[] = [];
  try {
    rows = await listRows<Post>(
      'posts',
      where('channel', '==', channel),
      where('created_at', '>', Timestamp.fromDate(since)),
      orderBy('created_at', 'desc'),
      qLimit(50),
    );
  } catch {
    rows = [];
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const r of rows) {
    const id = r.author_user_id;
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
      if (ordered.length >= limit) break;
    }
  }
  if (ordered.length === 0) return [];
  const nameById = await namesByIds(ordered);
  return ordered.map(id => ({ user_id: id, full_name: nameById.get(id) ?? null }));
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    await deleteDoc(ref('posts', postId));
    return true;
  } catch (err) {
    console.error('Failed to delete post:', (err as Error).message);
    return false;
  }
}

export async function getComments(postId: string): Promise<(PostComment & { author_name: string | null })[]> {
  let data: PostComment[];
  try {
    data = await listRows<PostComment>('post_comments', where('post_id', '==', postId), orderBy('created_at', 'asc'));
  } catch (err) {
    console.error('Failed to fetch comments:', (err as Error).message);
    return [];
  }
  if (data.length === 0) return [];

  const nameById = await namesByIds(data.map(c => c.author_user_id));
  return data.map(c => ({
    ...c,
    author_name: nameById.get(c.author_user_id) || null,
  }));
}

export async function createComment(args: {
  postId: string;
  authorUserId: string;
  body: string;
}): Promise<PostComment | null> {
  const row: Omit<PostComment, 'id'> = {
    post_id: args.postId,
    author_user_id: args.authorUserId,
    body: args.body.trim(),
    created_at: nowIso(),
  };
  try {
    const d = await addDoc(col('post_comments'), payloadOf(row));
    return { id: d.id, ...row };
  } catch (err) {
    console.error('Failed to create comment:', (err as Error).message);
    return null;
  }
}

export async function toggleReaction(args: {
  postId: string;
  userId: string;
  emoji: string;
}): Promise<boolean> {
  // Delete if present (toggle off); otherwise create.
  const r = ref('post_reactions', reactionDocId(args.postId, args.userId, args.emoji));
  try {
    const snap = await getDoc(r);
    if (snap.exists()) {
      await deleteDoc(r);
      return true;
    }
    await setDoc(r, payloadOf({
      post_id: args.postId,
      user_id: args.userId,
      emoji: args.emoji,
      created_at: nowIso(),
    }));
    return true;
  } catch (err) {
    console.error('Failed to toggle reaction:', (err as Error).message);
    return false;
  }
}

// Re-exported for callers that need to normalise raw Firestore timestamps.
export { toIso };
