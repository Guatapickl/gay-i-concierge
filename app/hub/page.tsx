"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, BookOpen, Users, Zap, Bot } from 'lucide-react';
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
      title: 'EVENTS',
      description: 'Browse and RSVP to upcoming events',
      icon: Calendar,
      gradient: 'from-primary to-purple-500',
    },
    {
      href: '/resources',
      title: 'RESOURCES',
      description: 'Access community resources and guides',
      icon: BookOpen,
      gradient: 'from-accent to-blue-500',
    },
    {
      href: '/robot',
      title: 'ROBOTS!',
      description: 'Explore the AI Robot Showcase',
      icon: Bot,
      gradient: 'from-cyan-400 to-blue-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-card p-8 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-accent/10 animate-pulse pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-accent" size={32} />
            <h1 className="text-5xl font-bold font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-accent">
              WELCOME {userName ? userName.toUpperCase() : 'BACK'}
            </h1>
          </div>
          <p className="text-xl text-gray-300 font-space max-w-3xl">
            Your command center for the <span className="text-accent">GAY-I CLUB</span> community.
            Stay connected, discover events, and access resources all in one place.
          </p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-2xl font-bold font-orbitron mb-4 text-white">QUICK ACCESS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group glass-card p-6 rounded-xl border border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,0,204,0.3)] relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`} />
              <div className="relative z-10">
                <action.icon className="text-primary group-hover:text-accent transition-colors mb-4" size={40} />
                <h3 className="text-xl font-bold font-orbitron mb-2 text-white group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* My RSVPs Section */}
      <div className="glass-card p-6 rounded-xl border border-white/10">
        <h2 className="text-2xl font-bold font-orbitron mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
          YOUR UPCOMING EVENTS
        </h2>
        <MyRsvps />
      </div>
    </div>
  );
}
