import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import AppLayout from '@/components/AppLayout';
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gay I Club",
  description: "Your AI-powered community hub",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gayiclub.com'),
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
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased bg-background text-foreground font-body">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
