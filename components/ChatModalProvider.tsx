"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, MessageCircle } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";

export default function ChatModalProvider() {
  const dialog = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const open = useCallback(() => {
    setIsChatOpen(true);
    setHasOpened(true);
  }, []);

  const close = useCallback(() => {
    setIsChatOpen(false);
    launcher.current?.focus();
  }, []);

  /* Escape to close */
  useEffect(() => {
    if (!isChatOpen) return;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const handler = (e: KeyboardEvent) => {
      if(e.key === "Tab") {
        const els=dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]');
        if(els?.length){if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus();}else if(!e.shiftKey&&document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus();}}
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isChatOpen, close]);

  return (
    <>
      {/* Floating action button */}
      <button
        ref={launcher}
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
          <div ref={dialog} className="chat-modal" role="dialog" aria-modal="true" aria-label="AIlex Concierge">
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

                  <span className="text-xs text-foreground-faint font-mono">AI assistant</span>
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
