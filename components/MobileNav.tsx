"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import AuthNav from "@/components/AuthNav";

export default function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);

    const links = [
        { href: '/hub', label: 'HUB' },
        { href: '/events', label: 'EVENTS' },
        { href: '/resources', label: 'RESOURCES' },
        { href: '/community', label: 'COMMUNITY' },
        { href: '/profile', label: 'PROFILE' },
    ];

    return (
        <>
            {/* Mobile Header / Trigger */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between glass z-50 border-b border-white/10">
                <Link href="/hub" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-orbitron tracking-widest drop-shadow-[0_0_5px_rgba(255,0,204,0.5)]">
                    GAY-I
                </Link>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-primary hover:text-accent transition-colors"
                    aria-label="Open menu"
                >
                    <Menu size={28} />
                </button>
            </div>

            {/* Drawer Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="absolute top-0 right-0 w-64 h-full glass border-l border-white/10 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] animate-fade-in">
                        <div className="h-16 flex items-center justify-end px-4 border-b border-white/10">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-primary hover:text-accent transition-colors"
                                aria-label="Close menu"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-3 text-lg font-medium border-l-2 border-transparent hover:border-primary hover:bg-white/5 hover:text-accent transition-all duration-300 font-orbitron tracking-wider"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="px-4 py-6 border-t border-white/10">
                            <AuthNav />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
