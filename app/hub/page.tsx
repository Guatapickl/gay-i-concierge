"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  BookOpen,
  Newspaper,
  Bot,
  ArrowRight,
  Repeat,
  MapPin,
  Pin,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUpcomingEvents } from '@/lib/events';
import { getFeed } from '@/lib/posts';
import { describeRecurrence } from '@/lib/recurrence';
import type { Event, FeedPost } from '@/types/supabase';
import MyRsvps from '@/components/MyRsvps';
import { LoadingSpinner } from '@/components/ui';

export default function Hub() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [recentPosts, setRecentPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      setUserId(uid);
      if (data.user?.email) {
        setUserName(data.user.email.split('@')[0]);
      }
      const [events, feed] = await Promise.all([
        getUpcomingEvents(),
        getFeed(uid, 3),
      ]);
      setNextEvent(events[0] || null);
      setRecentPosts(feed);
      setLoading(false);
    })();
  }, []);

  const quickActions = [
    {
      href: '/feed',
      title: 'Newsfeed',
      description: 'Updates, recaps, announcements',
      icon: Newspaper,
    },
    {
      href: '/events',
      title: 'Events',
      description: 'Browse and RSVP to meetings',
      icon: Calendar,
    },
    {
      href: '/resources',
      title: 'Resources',
      description: 'Community guides and tools',
      icon: BookOpen,
    },
    {
      href: '/robot',
      title: 'AI Showcase',
      description: 'Robots from member models',
      icon: Bot,
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading your hub..." className="py-12" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="space-y-2">
        <p className="text-foreground-muted text-sm font-medium">Welcome back</p>
        <h1 className="text-display-lg font-display font-bold text-foreground">
          {userName ? `Hey, ${userName}` : 'Your Hub'}
        </h1>
        <p className="text-foreground-muted max-w-xl">
          Your central place for meetings, recaps, and the club newsfeed.
        </p>
      </div>

      {/* Next meeting */}
      {nextEvent && <NextMeetingCard event={nextEvent} />}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="group card p-5 flex flex-col hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-surface-elevated border border-border group-hover:border-primary/30 transition-colors">
                  <action.icon className="w-5 h-5 text-foreground-muted group-hover:text-primary transition-colors" />
                </div>
                <ArrowRight className="w-4 h-4 text-foreground-subtle opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-foreground-muted">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-column: Feed preview + My RSVPs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FeedPreview posts={recentPosts} userId={userId} />
        </div>
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Your RSVPs
            </h2>
            <Link
              href="/events"
              className="text-sm text-primary hover:text-primary-muted transition-colors"
            >
              All events
            </Link>
          </div>
          <MyRsvps />
        </div>
      </div>
    </div>
  );
}

function NextMeetingCard({ event }: { event: Event }) {
  const when = new Date(event.event_datetime);
  const recurrenceLabel = describeRecurrence(event.recurrence_rule);
  const isSoon = when.getTime() - Date.now() < 1000 * 60 * 60 * 24;
  const dateStr = when.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="card-elevated p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge badge-primary">
            <Calendar className="w-3 h-3" />
            {isSoon ? 'Up next' : 'Next meeting'}
          </span>
          {recurrenceLabel && (
            <span className="badge">
              <Repeat className="w-3 h-3" />
              {recurrenceLabel}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          {event.title}
        </h2>
        <p className="text-foreground-muted mb-1">{dateStr}</p>
        {event.location && (
          <p className="text-foreground-muted flex items-center gap-1.5 text-sm">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="mt-3 text-sm text-foreground-muted line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background font-medium rounded-lg hover:bg-primary-muted transition-colors"
          >
            View details
            <ArrowRight className="w-4 h-4" />
          </Link>
          {Array.isArray(event.agenda) && event.agenda.length > 0 && (
            <Link
              href={`/events/${event.id}/agenda`}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              {event.agenda.length}-item agenda →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedPreview({ posts, userId }: { posts: FeedPost[]; userId: string | null }) {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          Latest from the feed
        </h2>
        <Link
          href="/feed"
          className="text-sm text-primary hover:text-primary-muted transition-colors"
        >
          Open feed
        </Link>
      </div>
      {!userId ? (
        <p className="text-foreground-muted text-sm py-6 text-center">
          Sign in to read the newsfeed
        </p>
      ) : posts.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-foreground-muted text-sm mb-2">No posts yet</p>
          <Link
            href="/feed"
            className="text-sm text-primary hover:text-primary-muted transition-colors"
          >
            Be the first to post →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map(p => (
            <li key={p.id}>
              <Link
                href="/feed"
                className="block p-3 rounded-lg hover:bg-surface-hover transition-colors -mx-1"
              >
                <div className="flex items-center gap-2 text-xs text-foreground-subtle mb-1">
                  <span className="font-medium text-foreground">
                    {p.author_name || 'Member'}
                  </span>
                  <span>·</span>
                  <time dateTime={p.created_at}>
                    {new Date(p.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  {p.is_pinned && (
                    <span className="ml-1 text-primary flex items-center gap-0.5">
                      <Pin className="w-3 h-3" />
                    </span>
                  )}
                  {p.is_announcement && (
                    <span className="ml-1 text-primary flex items-center gap-0.5">
                      <Megaphone className="w-3 h-3" />
                    </span>
                  )}
                </div>
                {p.title && (
                  <h3 className="font-medium text-foreground line-clamp-1">
                    {p.title}
                  </h3>
                )}
                <p className="text-sm text-foreground-muted line-clamp-2">
                  {p.body}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-foreground-subtle">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {p.comment_count}
                  </span>
                  {p.reactions.slice(0, 3).map(r => (
                    <span key={r.emoji}>
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
