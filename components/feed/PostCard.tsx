"use client";

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Pin, Megaphone, Calendar, Trash2, Smile } from 'lucide-react';
import type { FeedPost, PostComment } from '@/types/supabase';
import { getComments, createComment, toggleReaction, deletePost } from '@/lib/posts';
import { Button, FormTextarea } from '@/components/ui';

const QUICK_REACTIONS = ['👍', '🎉', '🔥', '❤️', '🤖', '🧠'];

type Props = {
  post: FeedPost;
  currentUserId: string;
  isAdmin: boolean;
  onChanged: () => void;
};

export default function PostCard({ post, currentUserId, isAdmin, onChanged }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<(PostComment & { author_name: string | null })[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [optimisticReactions, setOptimisticReactions] = useState(post.reactions);

  const canEdit = post.author_user_id === currentUserId || isAdmin;
  const author = post.author_name || 'Member';
  const initial = (author[0] || 'M').toUpperCase();
  const created = new Date(post.created_at);

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setLoadingComments(true);
    setShowComments(true);
    const data = await getComments(post.id);
    setComments(data);
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!commentBody.trim()) return;
    const comment = await createComment({
      postId: post.id,
      authorUserId: currentUserId,
      body: commentBody,
    });
    if (comment) {
      setCommentBody('');
      const data = await getComments(post.id);
      setComments(data);
      onChanged();
    }
  };

  const handleReaction = async (emoji: string) => {
    setShowReactionPicker(false);
    const existing = optimisticReactions.find(r => r.emoji === emoji);
    let next: typeof optimisticReactions;
    if (existing && existing.mine) {
      next = optimisticReactions
        .map(r => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r))
        .filter(r => r.count > 0);
    } else if (existing) {
      next = optimisticReactions.map(r =>
        r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r
      );
    } else {
      next = [...optimisticReactions, { emoji, count: 1, mine: true }];
    }
    setOptimisticReactions(next);
    await toggleReaction({ postId: post.id, userId: currentUserId, emoji });
  };

  return (
    <article className={`card p-5 ${post.is_pinned ? 'ring-1 ring-primary/30' : ''}`}>
      {/* Header */}
      <header className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary-subtle text-primary flex items-center justify-center font-semibold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{author}</span>
            {post.is_announcement && (
              <span className="badge badge-primary">
                <Megaphone className="w-3 h-3" /> Announcement
              </span>
            )}
            {post.is_pinned && (
              <span className="badge">
                <Pin className="w-3 h-3" /> Pinned
              </span>
            )}
          </div>
          <time className="text-xs text-foreground-subtle" dateTime={post.created_at}>
            {created.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </time>
        </div>
        {canEdit && (
          <button
            onClick={async () => {
              if (!confirm('Delete this post?')) return;
              const ok = await deletePost(post.id);
              if (ok) onChanged();
            }}
            className="text-foreground-subtle hover:text-danger transition-colors"
            aria-label="Delete post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Body */}
      {post.title && (
        <h3 className="text-lg font-semibold text-foreground mb-2">{post.title}</h3>
      )}
      <div className="text-foreground whitespace-pre-wrap leading-relaxed">{post.body}</div>

      {/* Linked event */}
      {post.event && (
        <Link
          href={`/events/${post.event.id}`}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm hover:border-primary/30 transition-colors"
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{post.event.title}</span>
          <span className="text-foreground-subtle">
            · {new Date(post.event.event_datetime).toLocaleDateString()}
          </span>
        </Link>
      )}

      {/* Reactions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 relative">
        {optimisticReactions.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji)}
            className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
              r.mine
                ? 'bg-primary-subtle border-primary/40 text-primary'
                : 'bg-surface border-border text-foreground-muted hover:border-foreground-subtle'
            }`}
          >
            {r.emoji} {r.count}
          </button>
        ))}
        <button
          onClick={() => setShowReactionPicker(s => !s)}
          className="px-2 py-1 rounded-full border border-dashed border-border text-foreground-subtle hover:text-foreground hover:border-foreground-subtle transition-colors"
          aria-label="Add reaction"
        >
          <Smile className="w-4 h-4" />
        </button>
        {showReactionPicker && (
          <div className="absolute top-full left-0 mt-1 z-10 flex gap-1 p-2 bg-surface-elevated border border-border rounded-lg shadow-medium">
            {QUICK_REACTIONS.map(e => (
              <button
                key={e}
                onClick={() => handleReaction(e)}
                className="text-xl hover:scale-110 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={loadComments}
          className="ml-auto flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {loadingComments ? (
            <p className="text-sm text-foreground-subtle">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-foreground-subtle">No comments yet.</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-elevated text-foreground-muted flex items-center justify-center text-sm font-semibold shrink-0">
                  {(c.author_name || 'M')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {c.author_name || 'Member'}
                    </span>
                    <span className="text-xs text-foreground-subtle">
                      {new Date(c.created_at).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))
          )}
          <div className="flex gap-2 pt-2">
            <FormTextarea
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              rows={2}
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!commentBody.trim()}
              onClick={submitComment}
            >
              Reply
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
