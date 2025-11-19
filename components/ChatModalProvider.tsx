"use client";

import { useState } from "react";
import ChatWindow from "@/components/ChatWindow";

export default function ChatModalProvider() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold z-50 group transition-all duration-300 hover:scale-110"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full animate-spin-slow opacity-75 group-hover:opacity-100"></div>
        <div className="absolute inset-1 bg-background rounded-full flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(255,0,204,0.5)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-orbitron">AI</span>
        </div>
      </button>

      {isChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col glass border border-primary/30 shadow-[0_0_30px_rgba(255,0,204,0.2)] rounded-lg overflow-hidden relative">
            {/* CRT Scanline Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[60] bg-[length:100%_2px,3px_100%] opacity-20"></div>

            <div className="p-4 border-b border-primary/30 flex justify-between items-center bg-black/40 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_5px_yellow]"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_green]"></div>
                <h2 className="ml-4 text-xl font-bold font-orbitron text-primary tracking-wider">AILEX_SYSTEM_V2.0</h2>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-primary hover:text-accent transition-colors text-2xl font-orbitron"
              >
                [X]
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-black/20 relative z-10">
              <ChatWindow />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
