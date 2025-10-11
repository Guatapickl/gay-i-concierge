import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Gay-I Club Concierge",
  description: "Gay-I Club Concierge App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex flex-col min-h-screen antialiased`}>
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-pink-600">Gay-I Club Concierge</h1>
            <nav className="space-x-4">
              <Link href="/" className="text-sm">Home</Link>
              <Link href="/events" className="text-sm">Events</Link>
              <Link href="/events/my" className="text-sm">My RSVPs</Link>
              <Link href="/invite" className="text-sm">Invite</Link>
              <Link href="/alerts" className="text-sm">Alerts</Link>
              <Link href="/alerts/unsubscribe" className="text-sm">Unsubscribe</Link>
              <Link href="/auth/sign-in" className="text-sm">Login</Link>
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
