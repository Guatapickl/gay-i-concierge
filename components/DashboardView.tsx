"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, Vote } from 'lucide-react';
import { getRow } from '@/lib/firebase/db';
import { currentUser } from '@/lib/firebase/authClient';
import { getUpcomingEvents } from '@/lib/events';
import { getNewsItems, relativeTime } from '@/lib/news';
import { isPollOpen, formatPollDeadline } from '@/lib/poll-scheduling';
import { getOpenPolls } from '@/lib/polls';
import { getChatChannels, getFeed } from '@/lib/posts';
import type { Event, NewsItem, MeetingPoll, ChatChannel, FeedPost } from '@/types/supabase';
import MyRsvps from '@/components/MyRsvps';
import { Alert, LoadingSpinner } from '@/components/ui';

export default function DashboardView() {
  const [name, setName] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [poll, setPoll] = useState<MeetingPoll | null>(null);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await currentUser();
        const [events, articles, polls, channelList, feed, profile] = await Promise.all([
          getUpcomingEvents(), getNewsItems(4), getOpenPolls(), getChatChannels(), getFeed(user?.uid || null, 3), user ? getRow<{ full_name?: string }>('user_profiles', user.uid) : null,
        ]);
        if (!active) return;
        setName(profile?.full_name?.split(' ')[0] || user?.displayName?.split(' ')[0] || '');
        setEvent(events[0] || null); setNews(articles); setPoll(polls.find(p => isPollOpen(p)) || null);
        setChannels(channelList); setPosts(feed);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." className="py-12" />;
  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-6">
        <p className="eyebrow mb-2">Your club, at a glance</p>
        <h1 className="page-heading">Welcome back{name ? `, ${name}` : ''}</h1>
        <p className="text-sm text-foreground-muted font-mono mt-3">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </header>
      {error && <Alert variant="error">Some dashboard updates could not load. Refresh to try again.</Alert>}
      {poll && isPollOpen(poll) && <Link href={`/vote/${poll.id}`} className="card flex items-center gap-4 p-4"><Vote className="w-5 h-5 text-primary" /><span className="flex-1"><span className="eyebrow block">Date vote open</span>{poll.title}{poll.closes_at && <span className="block text-xs text-foreground-muted mt-1">Closes {formatPollDeadline(poll.closes_at)}</span>}</span><ArrowRight className="w-4 h-4" /></Link>}
      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <PanelHeader title="Next meetup" href="/calendar" label="Calendar" />
            {event ? <div className="flex gap-5 mt-6">
              <div className="w-16 h-20 shrink-0 border border-border rounded-md bg-surface-elevated flex flex-col items-center justify-center"><span className="eyebrow">{new Date(event.event_datetime).toLocaleDateString(undefined, { month: 'short' })}</span><span className="text-3xl font-display">{new Date(event.event_datetime).getDate()}</span></div>
              <div className="min-w-0"><h3 className="text-xl font-display font-semibold">{event.title}</h3><p className="text-sm text-foreground-muted mt-2">{new Date(event.event_datetime).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}{event.location ? ` · ${event.location}` : ''}</p><div className="flex flex-wrap gap-3 mt-5"><Link href={`/events/${event.id}`} className="btn-brand">View event & RSVP</Link>{Array.isArray(event.agenda) && event.agenda.length > 0 && <Link href={`/events/${event.id}/agenda`} className="btn-secondary">View agenda</Link>}</div></div>
            </div> : <div className="py-8 text-foreground-muted text-sm"><Calendar className="w-6 h-6 mb-3 text-primary" />No upcoming meetups yet. Check back for the next gathering.</div>}
          </section>
          <section className="card p-6"><PanelHeader title="News feed" href="/news" label="All news" />{news.length ? <ul className="divide-y divide-border mt-3">{news.map(item => <li key={item.id} className="py-4"><a href={item.source_url} target="_blank" rel="noopener noreferrer" className="grid gap-2 sm:grid-cols-[76px_1fr] hover:text-primary"><time className="font-mono text-xs text-foreground-muted">{relativeTime(item.published_at || item.ingested_at)}</time><div><h3 className="font-medium leading-snug">{item.title}</h3><p className="text-xs text-foreground-muted mt-1">{item.source_name || item.tag || 'AI news'}</p></div></a></li>)}</ul> : <p className="py-7 text-sm text-foreground-muted">Check back for the next club news update.</p>}</section>
          <section className="card p-6"><PanelHeader title="Your RSVPs" href="/events" label="All events" /><div className="mt-4"><MyRsvps /></div></section>
        </div>
        <div className="space-y-6">
          <section className="card p-6"><PanelHeader title="Communication hub" href="/chat" label="Open" /><div className="mt-4 divide-y divide-border">{channels.length ? channels.slice(0, 6).map(channel => <Link key={channel.id} href="/chat" className="block py-3 text-sm text-foreground-muted hover:text-primary">{channel.name.startsWith('#') ? channel.name : `# ${channel.name}`}</Link>) : <p className="py-4 text-sm text-foreground-muted">Join the conversation in the communication hub.</p>}</div></section>
          <section className="card p-6"><PanelHeader title="Community feed" href="/feed" label="Open" /><div className="divide-y divide-border mt-3">{posts.length ? posts.map(post => <Link key={post.id} href="/feed" className="block py-4"><p className="text-sm line-clamp-3">{post.body}</p><p className="text-xs font-mono text-foreground-muted mt-2">{relativeTime(post.created_at)}</p></Link>) : <p className="py-5 text-sm text-foreground-muted">No community updates yet. Share something with the club.</p>}</div></section>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-mono text-foreground-muted"><Link href="/vote">Meeting date polls →</Link><Link href="/agenda">Agenda maker →</Link><Link href="/robot">Robot showcase →</Link><Link href="/community">Member directory →</Link></div>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title, href, label }: { title: string; href: string; label: string }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="section-heading">{title}</h2><Link href={href} className="text-xs text-primary font-mono whitespace-nowrap">{label} →</Link></div>;
}
