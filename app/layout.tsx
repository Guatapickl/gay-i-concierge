import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import AppLayout from '@/components/AppLayout';
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: 'Gay I Club — NYC AI community', template: '%s · Gay I Club' },
  authors: [{ name: 'VibeShift AI', url: 'https://vibeshiftai.com' }],
  other: { copyright: `© ${new Date().getFullYear()} VibeShift AI` },
  alternates: { canonical: 'https://gayiclub.com' },
  openGraph: { title: 'Gay I Club — NYC AI community', description: 'Gay people exploring the AI frontier. Monthly meetups in New York City.', url: 'https://gayiclub.com', siteName: 'Gay I Club', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Gay I Club — NYC AI community', description: 'Gay people exploring the AI frontier. Monthly meetups in New York City.' },
  description: "Gay people exploring the AI frontier. Monthly meetups to chat about the latest AI news and our latest builds.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gayiclub.com'),
};

export const viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0a0b0d" }, { media: "(prefers-color-scheme: light)", color: "#f7f7f5" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <head><script dangerouslySetInnerHTML={{__html: `(function(){try{var t=localStorage.getItem('gayiclub:theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){}})()`}} /></head>
      <body className="min-h-screen antialiased bg-background text-foreground font-body">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
