"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Calendar, BookOpen, User, Users } from "lucide-react";
import AuthNav from "@/components/AuthNav";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/hub', label: 'Hub', icon: Home },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/resources', label: 'Resources', icon: BookOpen },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between bg-surface/95 backdrop-blur-sm z-50 border-b border-border">
        <Link href="/hub" className="flex items-center gap-2">
          <img src="/logo.png" alt="Gay I Club" className="w-11 h-11" />
          <span className="text-xl font-display font-bold text-foreground">
            Gay I Club
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content */}
          <div className="absolute top-0 right-0 w-72 h-full bg-surface border-l border-border flex flex-col shadow-large animate-fade-in">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <span className="text-sm font-medium text-foreground-muted">Menu</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-foreground-muted hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg transition-all duration-150 ${
                    isActive(link.href)
                      ? 'bg-primary-subtle text-primary'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <link.icon size={20} className={isActive(link.href) ? 'text-primary' : ''} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            <div className="px-3 py-4 border-t border-border">
              <AuthNav />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
