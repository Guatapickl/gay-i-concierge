"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ArrowRight,
  Repeat,
  MapPin,
  Newspaper,
  MessageSquare,
  ListChecks,
  Bot,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUpcomingEvents } from '@/lib/events';
import { getNewsItems, relativeTime, colorForTag } from '@/lib/news';
import { describeRecurrence } from '@/lib/recurrence';
import type { Event, NewsItem } from '@/types/supabase';
import MyRsvps from '@/components/MyRsvps';
import { LoadingSpinner } from '@/components/ui';

/**
 * Authenticated landing — the post-login dashboard.
 *
 * Composition:
 *  - Welcome strip (greeting + tagline)
 *  - Next-meeting hero card (with recurrence pill, agenda link)
 *  - Quick actions row (Communication Hub / Calendar / Agenda / News / Robots)
 *  - Two-column: latest news preview + your upcoming RSVPs
 */
export default function DashboardView() {
  const [userName, setUserName] = useState<string | null>(null);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [recentNews, setRecentNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id || null;
      if (data.user?.email) setUserName(data.user.email.split('@')[0]);
      const [events, news] = await Promise.all([
        getUpcomingEvents(),
        getNewsItems(3),
      ]);
      setNextEvent(events[0] || null);
      setRecentNews(news);
      setLoading(false);
      // Use uid only to silence the unused-warning; future personalization hooks here.
      void uid;
    })();
  }, []);

  const quickActions = [
    {
      href: '/chat',
      title: 'Communication Hub',
      description: 'Post in a channel',
      icon: MessageSquare,
    },
    {
      href: '/calendar',
      title: 'Calendar',
      description: 'Browse meetings',
      icon: Calendar,
    },
    {
      href: '/agenda',
      title: 'Agenda Maker',
      description: 'Plan a meeting',
      icon: ListChecks,
    },
    {
      href: '/news',
      title: 'News Feed',
      description: 'Latest in AI',
      icon: Newspaper,
    },
    {
      href: '/robot',
      title: 'Robot Benchmark',
      description: 'Compare frontier models',
      icon: Bot,
    },
  ];

  if (loading) return <LoadingSpinner text="Loading your hub..." className="py-12" />;

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground-faint font-mono tracking-wide">
          WELCOME BACK
        </p>
        <h1 className="text-display-lg font-display text-foreground">
          {userName ? `Hey, ${userName}` : 'Your dashboard'}
        </h1>
        <p className="text-foreground-muted">
          Meetings, recaps, and the latest from the AI frontier — all in one place.
        </p>
      </div>

      {nextEvent && <NextMeetingCard event={nextEvent} />}

      <div>
        <h2 className="text-xs font-bold text-foreground-faint tracking-[0.12em] uppercase mb-3 font-mono">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="group card p-4 flex flex-col hover:border-border-strong"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-surface-elevated border border-border group-hover:border-primary transition-colors">
                  <action.icon className="w-4 h-4 text-foreground-muted group-hover:text-primary-muted transition-colors" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-foreground-faint opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary-muted transition-colors mb-0.5">
                {action.title}
              </h3>
              <p className="text-xs text-foreground-muted">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <NewsPreview items={recentNews} />
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-display font-bold text-foreground">
              Your RSVPs
            </h2>
            <Link
              href="/calendar"
              className="text-xs text-primary-muted hover:opacity-70 transition-opacity font-mono uppercase tracking-wide"
            >
              All →
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
  const recurrence = describeRecurrence(event.recurrence_rule);
  const isSoon = when.getTime() - Date.now() < 24 * 3600 * 1000;
  const dateStr = when.toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="card-tinted p-6 relative overflow-hidden">
      <div
        className="absolute -top-32 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,45,155,0.18), transparent 70%)' }}
      />
      <div className="relative">
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <span className="badge badge-primary">
            <Calendar className="w-3 h-3" />
            {isSoon ? 'Up next' : 'Next meeting'}
          </span>
          {recurrence && (
            <span className="badge badge-purple">
              <Repeat className="w-3 h-3" />
              {recurrence}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-display font-extrabold text-foreground mb-1.5 tracking-tight">
          {event.title}
        </h2>
        <p className="text-foreground-muted">{dateStr}</p>
        {event.location && (
          <p className="text-foreground-muted flex items-center gap-1.5 text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="mt-3 text-sm text-foreground-muted line-clamp-2 max-w-2xl">
            {event.description}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={`/events/${event.id}`} className="btn-brand inline-flex items-center gap-2 text-sm">
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

function NewsPreview({ items }: { items: NewsItem[] }) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary-muted" />
          Latest news
        </h2>
        <Link
          href="/news"
          className="text-xs text-primary-muted hover:opacity-70 transition-opacity font-mono uppercase tracking-wide"
        >
          Open feed →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-foreground-muted text-sm mb-1">No news ingested yet</p>
          <p className="text-foreground-faint text-xs">
            The Cortex publishes here once its nightly cycle runs
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(it => {
            const color = colorForTag(it.tag, it.tag_color);
            return (
              <li key={it.id}>
                <a
                  href={it.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg hover:bg-surface-hover transition-colors -mx-1"
                >
                  <div className="flex items-center gap-2 text-[11px] text-foreground-faint mb-1 font-mono">
                    {it.tag && (
                      <span
                        className="px-1.5 py-0.5 rounded-full font-bold"
                        style={{ color, background: `${color}12`, border: `1px solid ${color}` }}
                      >
                        {it.tag}
                      </span>
                    )}
                    <span>·</span>
                    <span>{relativeTime(it.published_at || it.ingested_at)}</span>
                    {it.is_hot && <span className="text-[#e05000]">🔥</span>}
                  </div>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{it.title}</h3>
                  <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5">{it.summary}</p>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
