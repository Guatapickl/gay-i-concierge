"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AvatarMenu from "@/components/AvatarMenu";
import BrandLogo from "@/components/BrandLogo";
import ChatModalProvider from "@/components/ChatModalProvider";

type NavItem = { href: string; label: string; icon: string; description: string };

const NAV_ITEMS: NavItem[] = [
  { href: '/chat',      label: 'Communication Hub', icon: '💬', description: 'Chat with club members across channels' },
  { href: '/news',      label: 'News Feed',         icon: '📡', description: 'The latest in AI — curated for the community' },
  { href: '/events',    label: 'Events',            icon: '🎟️', description: 'Upcoming gatherings, meetups & RSVP' },
  { href: '/feed',      label: 'Community Feed',    icon: '📰', description: 'Updates, recaps & announcements from the club' },
  { href: '/calendar',  label: 'Meeting Calendar',  icon: '📅', description: 'Upcoming events, meetups & workshops' },
  { href: '/resources', label: 'Resources',         icon: '📚', description: 'Community guides, tools & learning materials' },
  { href: '/agenda',    label: 'Agenda Maker',      icon: '📋', description: 'Plan and export meeting agendas' },
  { href: '/robot',     label: 'Robot Benchmark',   icon: '🤖', description: 'Benchmark SOTA models on SVG robot generation' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Treat exact and nested matches as active (e.g. /events/123 highlights Calendar later)
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');
  const current = NAV_ITEMS.find(n => isActive(n.href));

  // Routes that should render OUTSIDE the chrome (auth pages only).
  // The home route `/` now uses chrome and switches landing/dashboard server-side.
  const isChromeless = pathname?.startsWith('/auth');

  if (isChromeless) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-body">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border h-16 px-4 md:px-8 flex items-center justify-between" style={{ boxShadow: '0 2px 20px rgba(200,150,255,0.1)' }}>
        <Link href="/calendar" className="flex items-center gap-3 shrink-0 group">
          <BrandLogo size={32} />
          <div className="hidden sm:block">
            <div className="font-display font-bold text-foreground text-base leading-tight tracking-tight">
              Gay I Club
            </div>
            <div className="text-[10px] text-foreground-faint tracking-[0.06em] font-mono">
              New York City · Est. 2024
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-surface-soft text-primary-muted font-bold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                }`}
                style={active ? { boxShadow: 'inset 0 0 0 1.5px rgba(255,45,155,0.27)' } : undefined}
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block ml-3">
          <AvatarMenu />
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="lg:hidden p-2 rounded-md text-foreground-muted hover:bg-surface-hover transition-colors"
          aria-label="Open menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden bg-surface border-b border-border px-4 py-2 flex flex-col gap-1 animate-fade-in">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-surface-soft text-primary-muted font-bold'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-border mt-1">
            <AvatarMenu />
          </div>
        </div>
      )}

      {/* Animated shimmer accent bar */}
      <div className="shimmer-bar" />

      {/* Page header */}
      {current && (
        <div className="bg-surface border-b border-border px-4 md:px-8 py-5">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <span className="text-[36px] leading-none shrink-0" aria-hidden>
              {current.icon}
            </span>
            <div>
              <h1 className="text-display-md font-display text-foreground">
                {current.label}
              </h1>
              <p className="text-sm text-foreground-subtle mt-0.5">
                {current.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 md:px-8 py-7">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border py-4 px-4 md:px-8 flex flex-wrap items-center justify-center gap-3 text-[13px]">
        <span className="text-foreground-faint">© 2026 Gay I Club NYC</span>
        <span className="text-base" aria-hidden>🏳️‍🌈</span>
        <span className="text-foreground-faint">Queer people exploring the AI frontier</span>
      </footer>

      <ChatModalProvider />
    </div>
  );
}
