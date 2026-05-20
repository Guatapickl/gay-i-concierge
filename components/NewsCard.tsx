"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Sparkles, Bookmark, BookmarkCheck, Clock, ShieldAlert } from 'lucide-react';
import type { NewsItem } from '@/types/supabase';
import { relativeTime, colorForTag } from '@/lib/news';

interface NewsCardProps {
  item: NewsItem;
  isSaved: boolean;
  userId: string | null;
  onToggleSave: (id: string) => void;
}

export default function NewsCard({ item, isSaved, userId, onToggleSave }: NewsCardProps) {
  const color = colorForTag(item.tag, item.tag_color);

  const getSourceDisplay = () => {
    if (item.source_name) return item.source_name;
    try {
      const url = new URL(item.source_url);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return 'Unknown Source';
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="relative flex flex-col gap-4 p-6 rounded-2xl border border-border bg-surface overflow-hidden group transition-all shadow-soft hover:shadow-medium hover:border-border-strong duration-300"
    >
      {/* Dynamic ambient glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% -20%, ${color}0b, transparent 65%)` }}
      />
      
      {/* Top Meta Row */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {item.tag ? (
            <span
              className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full font-mono border"
              style={{
                borderColor: `${color}40`,
                color,
                background: `${color}0b`,
              }}
            >
              {item.tag}
            </span>
          ) : (
            <span className="badge">
              Uncategorized
            </span>
          )}
        </div>
        {item.is_hot && (
          <motion.div 
            animate={{ opacity: [1, 0.6, 1] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1.5 text-[10px] text-primary-muted font-bold uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Hot
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-3 z-10 flex-1">
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-lg text-foreground leading-tight group-hover:text-primary-muted transition-colors"
          title={item.title}
        >
          {item.title}
        </a>
        
        <p className="text-sm text-foreground-muted leading-relaxed flex-1 line-clamp-4">
          {item.summary}
        </p>
      </div>

      {/* Relevance Score (Optional visual element if score exists) */}
      {item.relevance_score !== null && item.relevance_score > 0.8 && (
        <div className="z-10 flex items-center gap-2 mt-2">
          <div className="h-1 flex-1 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full" 
              style={{ width: `${item.relevance_score * 100}%`, background: color }} 
            />
          </div>
          <span className="text-[10px] font-mono text-foreground-faint uppercase">
            Match {Math.round(item.relevance_score * 100)}%
          </span>
        </div>
      )}

      {/* Footer Meta Row */}
      <div className="flex items-center justify-between pt-4 mt-auto border-t border-border z-10">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-xs text-foreground-muted font-medium">
            <ShieldAlert className="w-3.5 h-3.5 opacity-50" />
            {getSourceDisplay()}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-foreground-faint font-mono">
            <Clock className="w-3 h-3 opacity-50" />
            {relativeTime(item.published_at || item.ingested_at)}
          </span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-elevated hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-all border border-border-subtle hover:border-border-strong"
            aria-label="Read full article"
            title="Read full article"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          
          {userId && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(item.id);
              }}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border ${
                isSaved
                  ? 'bg-cyan/10 border-cyan/40 text-cyan shadow-[0_0_12px_rgba(0,153,204,0.15)]'
                  : 'bg-surface-elevated border-border-subtle text-foreground-muted hover:text-foreground hover:border-border-strong hover:bg-surface-hover'
              }`}
              aria-label={isSaved ? "Remove from saved" : "Save article"}
              title={isSaved ? "Saved" : "Save"}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
