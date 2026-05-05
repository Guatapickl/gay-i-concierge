"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MessageCircle } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";

export default function ChatModalProvider() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const open = useCallback(() => {
    setIsChatOpen(true);
    setHasOpened(true);
  }, []);

  const close = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  /* Escape to close */
  useEffect(() => {
    if (!isChatOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isChatOpen, close]);

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={open}
        className="chat-fab"
        aria-label="Open AIlex Concierge"
      >
        <div className="chat-fab-ring" />
        <div className="chat-fab-inner">
          <MessageCircle className="w-6 h-6 text-primary" />
        </div>
        {/* Pulse ring */}
        {!hasOpened && (
          <span className="chat-fab-pulse" />
        )}
      </button>

      {/* Modal overlay */}
      {isChatOpen && (
        <div
          className="chat-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="chat-modal">
            {/* Header */}
            <div className="chat-modal-header">
              <div className="flex items-center gap-3">
                <div className="chat-avatar-ai text-xs">AI</div>
                <div>
                  <h2 className="text-sm font-bold font-display text-foreground tracking-tight">
                    AIlex Concierge
                  </h2>
                  <p className="text-[10px] text-foreground-faint font-mono tracking-wide">
                    Gay I Club NYC • AI Assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
                  <span className="text-[10px] text-foreground-faint font-mono">online</span>
                </div>
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat body */}
            <div className="chat-modal-body">
              <ChatWindow />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
