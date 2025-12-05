"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Menu, Home, Calendar, BookOpen, Users, User } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import MobileNav from "@/components/MobileNav";
import ChatModalProvider from "@/components/ChatModalProvider";
import BackgroundParticles from "@/components/BackgroundParticles";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navLinks = [
        { href: '/hub', label: 'HUB', icon: Home },
        { href: '/events', label: 'EVENTS', icon: Calendar },
        { href: '/resources', label: 'RESOURCES', icon: BookOpen },
        { href: '/profile', label: 'PROFILE', icon: User },
    ];

    return (
        <div className="flex min-h-screen antialiased relative bg-background text-foreground">
            <BackgroundParticles />

            {/* Desktop Sidebar */}
            {isSidebarOpen && (
                <aside className="hidden md:flex w-64 glass border-r border-white/10 relative z-40 flex-col shadow-[0_0_15px_rgba(0,255,255,0.1)] animate-fade-in">
                    <div className="h-20 flex items-center justify-between px-4 border-b border-white/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse pointer-events-none" />
                        <Link href="/hub" className="flex items-center gap-2 z-10 group">
                            <img
                                src="/logo.png"
                                alt="Gay-I Logo"
                                className="w-12 h-12 group-hover:scale-110 transition-transform duration-300"
                            />
                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-orbitron tracking-widest drop-shadow-[0_0_5px_rgba(255,0,204,0.5)]">
                                GAY-I-CLUB
                            </span>
                        </Link>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1 text-primary hover:text-accent transition-colors z-20"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    </div>
                    <nav className="flex-1 px-4 py-6 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="flex items-center px-4 py-3 text-lg font-medium rounded-none border-l-2 border-transparent hover:border-primary hover:bg-white/5 hover:text-accent transition-all duration-300 font-orbitron tracking-wider group"
                            >
                                <link.icon size={20} className="mr-3 opacity-70 group-hover:opacity-100" />
                                <span className="group-hover:translate-x-2 transition-transform duration-300">{link.label}</span>
                            </Link>
                        ))}
                    </nav>
                    <div className="px-4 py-6 border-t border-white/10">
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
                        className="hidden md:flex absolute top-4 left-4 z-50 p-2 glass rounded-full text-primary hover:text-accent transition-all hover:scale-110 shadow-[0_0_10px_rgba(255,0,204,0.3)]"
                        aria-label="Expand sidebar"
                    >
                        <Menu size={24} />
                    </button>
                )}

                <main className="flex-1 p-4 pt-20 md:p-8 relative z-10 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>

            <ChatModalProvider />
        </div>
    );
}
