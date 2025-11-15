import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Orbitron } from "next/font/google";
import AuthNav from '@/components/AuthNav'
import BackgroundParticles from '@/components/BackgroundParticles';
import HeaderTitle from '@/components/HeaderTitle';
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
  const primaryNavLinks = [
    { href: "/", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/resources", label: "Resources" },
    { href: "/community", label: "Community" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <html lang="en" className={`${inter.className} ${orbitron.variable}`}>
      <body className="flex flex-col min-h-screen antialiased relative bg-black">
        <BackgroundParticles />
        <header className="bg-gray-900/80 backdrop-blur-lg shadow relative z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              <div className="flex items-center md:flex-1 md:justify-start">
                <HeaderTitle />
              </div>
              <nav className="flex justify-center md:flex-1">
                <ul className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold uppercase tracking-wide text-gray-200">
                  {primaryNavLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-md px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="flex items-center justify-end md:flex-1">
                <AuthNav />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 relative z-10 max-w-7xl">{children}</main>
        <footer className="bg-gray-900/80 backdrop-blur-lg relative z-10">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Gay-I Club Concierge. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
