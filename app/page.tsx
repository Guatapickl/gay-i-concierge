"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-6">
      <main className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <img
            src="/logo.png"
            alt="Gay I Club Logo"
            className="w-40 h-40 mx-auto"
          />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="space-y-4 mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="badge badge-primary">
              <Sparkles className="w-3 h-3 mr-1.5" />
              AI-Powered
            </span>
          </div>
          <h1 className="text-display-xl md:text-[5rem] font-display font-bold text-foreground tracking-tight">
            Welcome to the
            <br />
            <span className="gradient-text">Gay I Club</span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-xl md:text-2xl text-foreground-muted font-body max-w-2xl mb-12 leading-relaxed"
        >
          Your community concierge for events, resources, and connections.
          <br className="hidden md:block" />
          Built for the curious minds of NYC.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md"
        >
          <Link
            href="/auth/sign-in"
            className="group relative w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-primary text-background font-display font-semibold rounded-xl transition-all duration-200 hover:bg-primary-muted hover:shadow-medium"
          >
            Sign In
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/auth/sign-up"
            className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-surface border border-border text-foreground font-display font-semibold rounded-xl transition-all duration-200 hover:bg-surface-elevated hover:border-primary/30"
          >
            Create Account
          </Link>
        </motion.div>

        {/* Decorative Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20 flex items-center gap-3 text-foreground-subtle text-sm"
        >
          <div className="w-12 h-px bg-border" />
          <span>A community for AI enthusiasts</span>
          <div className="w-12 h-px bg-border" />
        </motion.div>
      </main>
    </div>
  );
}
