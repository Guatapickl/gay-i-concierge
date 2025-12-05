import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import AppLayout from '@/components/AppLayout';
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "The Gay I Club Hub",
  description: "Official Hub for The Gay-I Club",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: "The Gay I Club Hub",
    description: "Official Hub for The Gay-I Club",
    siteName: "The Gay I Club Hub",
    images: [{
      url: '/logo.png',
      width: 1200,
      height: 630,
      alt: 'The Gay I Club Hub',
    }],
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} ${orbitron.variable}`}>
      <body className="min-h-screen antialiased bg-background text-foreground">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
