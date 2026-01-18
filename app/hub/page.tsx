"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, BookOpen, Bot, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MyRsvps from '@/components/MyRsvps';

export default function Hub() {
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setUserName(data.user.email.split('@')[0]);
      }
    })();
  }, []);

  const quickActions = [
    {
      href: '/events',
      title: 'Events',
      description: 'Browse and RSVP to upcoming gatherings',
      icon: Calendar,
    },
    {
      href: '/resources',
      title: 'Resources',
      description: 'Access community guides and materials',
      icon: BookOpen,
    },
    {
      href: '/robot',
      title: 'AI Showcase',
      description: 'Explore the AI robot collection',
      icon: Bot,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="space-y-2">
        <p className="text-foreground-muted text-sm font-medium">Welcome back</p>
        <h1 className="text-display-lg font-display font-bold text-foreground">
          {userName ? `Hey, ${userName}` : 'Your Hub'}
        </h1>
        <p className="text-foreground-muted max-w-xl">
          Your central place for community events, resources, and connections.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group card p-5 flex flex-col hover:border-primary/30"
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
              <p className="text-sm text-foreground-muted">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* My RSVPs Section */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-semibold text-foreground">
            Your Upcoming Events
          </h2>
          <Link
            href="/events"
            className="text-sm text-primary hover:text-primary-muted transition-colors"
          >
            View all
          </Link>
        </div>
        <MyRsvps />
      </div>
    </div>
  );
}
