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
      whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="relative flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden group transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
    >
      {/* Dynamic ambient glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% -20%, ${color}, transparent 80%)` }}
      />
      
      {/* Top Meta Row */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {item.tag ? (
            <span
              className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm font-mono border backdrop-blur-md"
              style={{
                borderColor: `${color}60`,
                color,
                background: `${color}15`,
                boxShadow: `0 0 10px ${color}20`
              }}
            >
              {item.tag}
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm font-mono border border-white/10 text-gray-400 bg-white/5">
              Uncategorized
            </span>
          )}
        </div>
        {item.is_hot && (
          <motion.div 
            animate={{ opacity: [1, 0.6, 1] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1.5 text-[12px] text-[#ff3366] font-bold uppercase tracking-widest bg-[#ff3366]/10 px-2 py-0.5 rounded-full border border-[#ff3366]/30"
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
          className="font-bold text-lg text-gray-100 leading-tight group-hover:text-white transition-colors"
          title={item.title}
        >
          {item.title}
        </a>
        
        <p className="text-[14px] text-gray-400 leading-relaxed flex-1 line-clamp-4">
          {item.summary}
        </p>
      </div>

      {/* Relevance Score (Optional visual element if score exists) */}
      {item.relevance_score !== null && item.relevance_score > 0.8 && (
        <div className="z-10 flex items-center gap-2 mt-2">
          <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full" 
              style={{ width: `${item.relevance_score * 100}%`, background: color }} 
            />
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase">
            Match {Math.round(item.relevance_score * 100)}%
          </span>
        </div>
      )}

      {/* Footer Meta Row */}
      <div className="flex items-center justify-between pt-4 mt-auto border-t border-white/10 z-10">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[12px] text-gray-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 opacity-50" />
            {getSourceDisplay()}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
            <Clock className="w-3 h-3 opacity-50" />
            {relativeTime(item.published_at || item.ingested_at)}
          </span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/20"
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
                  ? 'bg-[#00ffcc]/10 border-[#00ffcc]/50 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.25)]'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10'
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
