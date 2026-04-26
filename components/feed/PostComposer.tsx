"use client";

import { useState } from 'react';
import { Megaphone, Pin, Send } from 'lucide-react';
import { Button, FormInput, FormTextarea, Alert } from '@/components/ui';
import { createPost } from '@/lib/posts';
import type { Event } from '@/types/supabase';

type Props = {
  userId: string;
  isAdmin: boolean;
  upcomingEvents: Event[];
  onPosted: () => void;
};

export default function PostComposer({ userId, isAdmin, upcomingEvents, onPosted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventId, setEventId] = useState<string>('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setBody('');
    setEventId('');
    setIsAnnouncement(false);
    setIsPinned(false);
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="card p-5 w-full text-left hover:border-primary/30 transition-colors"
      >
        <span className="text-foreground-muted">Share an update with the club…</span>
      </button>
    );
  }

  return (
    <div className="card-elevated p-5 space-y-4 animate-fade-in">
      <FormInput
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title (optional)"
      />
      <FormTextarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="What's on your mind? (markdown supported)"
        rows={5}
      />

      {upcomingEvents.length > 0 && (
        <div>
          <label className="block text-sm text-foreground-muted mb-1.5">
            Link to an event (optional)
          </label>
          <select
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm focus:border-primary focus:outline-none"
          >
            <option value="">— None —</option>
            {upcomingEvents.map(e => (
              <option key={e.id} value={e.id}>
                {e.title} · {new Date(e.event_datetime).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnnouncement}
              onChange={e => setIsAnnouncement(e.target.checked)}
              className="rounded"
            />
            <Megaphone className="w-4 h-4" />
            Announcement
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
              className="rounded"
            />
            <Pin className="w-4 h-4" />
            Pin to top
          </label>
        </div>
      )}

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          disabled={submitting || !body.trim()}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            const post = await createPost({
              authorUserId: userId,
              title: title.trim() || null,
              body,
              eventId: eventId || null,
              isAnnouncement,
              isPinned,
            });
            setSubmitting(false);
            if (post) {
              reset();
              onPosted();
            } else {
              setError('Failed to create post.');
            }
          }}
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Posting…' : 'Post'}
        </Button>
        <Button variant="ghost" onClick={reset}>Cancel</Button>
      </div>
    </div>
  );
}
