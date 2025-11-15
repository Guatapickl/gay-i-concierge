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
        <aside className="w-64 bg-gray-900/80 backdrop-blur-lg shadow relative z-10 flex flex-col">
          <div className="h-16 flex items-center justify-center">
            <Link href="/hub" className="text-2xl font-bold text-primary font-orbitron">
              GAY-I
            </Link>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            <Link href="/hub" className="flex items-center px-4 py-2 text-lg font-medium rounded-md hover:bg-gray-800">
              Hub
            </Link>
            <Link href="/events" className="flex items-center px-4 py-2 text-lg font-medium rounded-md hover:bg-gray-800">
              Events
            </Link>
            <Link href="/resources" className="flex items-center px-4 py-2 text-lg font-medium rounded-md hover:bg-gray-800">
              Resources
            </Link>
            <Link href="/community" className="flex items-center px-4 py-2 text-lg font-medium rounded-md hover:bg-gray-800">
              Community
            </Link>
            <Link href="/profile" className="flex items-center px-4 py-2 text-lg font-medium rounded-md hover:bg-gray-800">
              Profile
            </Link>
          </nav>
          <div className="px-4 py-6">
            <AuthNav />
          </div>
        </aside>
        <div className="flex flex-col flex-1">
          <main className="flex-1 p-8 relative z-10">{children}</main>
        </div>
        <ChatModalProvider />
      </body>
    </html>
  );
}
