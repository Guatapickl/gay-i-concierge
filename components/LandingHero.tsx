"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * Unauthenticated home content. Renders below the standard top-nav so
 * the brand logo lives in the chrome — keep this hero compact.
 */
export default function LandingHero() {
  return (
    <div className="max-w-3xl mx-auto text-center py-8 md:py-16 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-5 mb-8"
      >
        <span className="badge badge-primary inline-flex">
          <Sparkles className="w-3 h-3" />
          Queer people exploring the AI frontier
        </span>
        <h1 className="text-display-xl font-display text-foreground tracking-tight">
          New York City&rsquo;s home for{' '}
          <span className="gradient-text">queer AI</span>
        </h1>
        <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
          Monthly meetups, paper club, hands-on workshops, and a running newsfeed of
          what just shipped — built by us, for us.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Link href="/auth/sign-up" className="btn-brand group inline-flex items-center gap-2 text-base">
          Join the club
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/auth/sign-in"
          className="bg-surface border-[1.5px] border-border-subtle text-foreground font-bold px-6 py-2.5 rounded-lg hover:border-border-strong transition-colors"
        >
          Sign in
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 text-left"
      >
        <FeatureBlurb
          emoji="💬"
          title="Communication Hub"
          body="Discussions across channels — model releases, paper club, off-topic, NYC-specific."
        />
        <FeatureBlurb
          emoji="📅"
          title="Meeting Calendar"
          body="Recurring meetups with reminders, agendas, RSVPs, and one-tap calendar export."
        />
        <FeatureBlurb
          emoji="📡"
          title="News Feed"
          body="An AI-summarized digest of the most relevant releases, papers, and policy moves."
        />
      </motion.div>

      <div className="mt-14 flex items-center justify-center gap-3 text-foreground-faint text-xs font-mono tracking-wide">
        <span className="w-12 h-px bg-border-strong" />
        <span>NYC · EST. 2024 · 🏳️‍🌈</span>
        <span className="w-12 h-px bg-border-strong" />
      </div>
    </div>
  );
}

function FeatureBlurb({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="text-2xl mb-2">{emoji}</div>
      <h3 className="font-display font-bold text-foreground text-base mb-1">{title}</h3>
      <p className="text-sm text-foreground-muted leading-relaxed">{body}</p>
    </div>
  );
}
