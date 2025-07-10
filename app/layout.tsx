import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import { InteractiveNavButton } from '@/components/InteractiveNavButton'
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
  return (
    <html lang="en" className={`${inter.className} ${orbitron.variable}`}>
      <body className="flex flex-col min-h-screen antialiased relative bg-black">
        <BackgroundParticles />
        <header className="bg-gray-900/80 backdrop-blur-lg shadow relative z-10">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between md:items-center">
            <HeaderTitle />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 flex-1 relative z-10">{children}</main>
        <nav className="bg-gray-900/80 backdrop-blur-lg shadow relative z-10">
          <div className="container mx-auto px-4 py-4 flex justify-center space-x-4 font-orbitron">
            <InteractiveNavButton href="/">Home</InteractiveNavButton>
            <InteractiveNavButton href="/events">Events</InteractiveNavButton>
            <InteractiveNavButton href="/invite">Invite</InteractiveNavButton>
          </div>
        </nav>
        <footer className="bg-gray-900/80 backdrop-blur-lg relative z-10">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Gay-I Club Concierge. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
