import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import Link from 'next/link';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
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
    <html lang="en" className={`${orbitron.variable} ${geistSans.variable} ${geistMono.variable}`}> 
      <body className="flex flex-col min-h-screen antialiased relative">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between md:items-center">
            <h1 className="text-2xl font-bold text-pink-600 text-center md:text-left">Gay-I Club Concierge</h1>
            <nav className="mt-2 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 text-center">
              <Link
                href="/"
                className="text-sm font-space px-3 py-2 rounded-md backdrop-blur-sm bg-white/5 border border-cyan-500 text-cyan-500 transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]"
              >
                Home
              </Link>
              <Link
                href="/events"
                className="text-sm font-space px-3 py-2 rounded-md backdrop-blur-sm bg-white/5 border border-cyan-500 text-cyan-500 transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]"
              >
                Events
              </Link>
              <Link
                href="/invite"
                className="text-sm font-space px-3 py-2 rounded-md backdrop-blur-sm bg-white/5 border border-cyan-500 text-cyan-500 transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]"
              >
                Invite
              </Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
        <footer className="bg-gray-100">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Gay-I Club Concierge. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
