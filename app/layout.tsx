import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import Link from 'next/link';
import AuthNav from '@/components/AuthNav';
import BackgroundParticles from '@/components/BackgroundParticles';
import ChatModalProvider from "@/components/ChatModalProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "Gay-I Club Concierge",
  description: "Gay-I Club Concierge App",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} ${orbitron.variable}`}>
      <body className="flex min-h-screen antialiased relative bg-background text-foreground">
        <BackgroundParticles />
        <aside className="w-64 glass border-r border-white/10 relative z-40 flex flex-col shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <div className="h-20 flex items-center justify-center border-b border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" />
            <Link href="/hub" className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-orbitron tracking-widest z-10 drop-shadow-[0_0_5px_rgba(255,0,204,0.5)]">
              GAY-I
            </Link>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-4">
            {[
              { href: '/hub', label: 'HUB' },
              { href: '/events', label: 'EVENTS' },
              { href: '/resources', label: 'RESOURCES' },
              { href: '/community', label: 'COMMUNITY' },
              { href: '/profile', label: 'PROFILE' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-4 py-3 text-lg font-medium rounded-none border-l-2 border-transparent hover:border-primary hover:bg-white/5 hover:text-accent transition-all duration-300 font-orbitron tracking-wider group"
              >
                <span className="group-hover:translate-x-2 transition-transform duration-300">{link.label}</span>
              </Link>
            ))}
          </nav>
          <div className="px-4 py-6 border-t border-white/10">
            <AuthNav />
          </div>
        </aside>
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 p-8 relative z-10">{children}</main>
        </div>
        <ChatModalProvider />
      </body>
    </html>
  );
}
