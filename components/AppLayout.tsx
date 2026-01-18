"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Menu, Home, Calendar, BookOpen, User } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import MobileNav from "@/components/MobileNav";
import ChatModalProvider from "@/components/ChatModalProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  const navLinks = [
    { href: '/hub', label: 'Hub', icon: Home },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/resources', label: 'Resources', icon: BookOpen },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <div className="flex min-h-screen antialiased relative bg-background text-foreground">
      {/* Desktop Sidebar */}
      {isSidebarOpen && (
        <aside className="hidden md:flex w-64 bg-surface border-r border-border relative z-40 flex-col animate-fade-in">
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-border">
            <Link href="/hub" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Gay I Club Logo"
                className="w-12 h-12 transition-transform duration-200 group-hover:scale-105"
              />
              <span className="text-xl font-display font-bold text-foreground tracking-tight">
                Gay I Club
              </span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover rounded-lg transition-all"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                  isActive(link.href)
                    ? 'bg-primary-subtle text-primary'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <link.icon size={18} className={isActive(link.href) ? 'text-primary' : ''} />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="px-3 py-4 border-t border-border">
            <AuthNav />
          </div>
        </aside>
      )}

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Desktop Expand Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex absolute top-4 left-4 z-50 p-2.5 bg-surface border border-border rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-elevated transition-all shadow-soft"
            aria-label="Expand sidebar"
          >
            <Menu size={18} />
          </button>
        )}

        <main className="flex-1 p-4 pt-20 md:p-8 relative z-10 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>

      <ChatModalProvider />
    </div>
  );
}
