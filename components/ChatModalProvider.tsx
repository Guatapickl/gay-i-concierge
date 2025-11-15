"use client";

import { useState } from "react";
import ChatWindow from "@/components/ChatWindow";

export default function ChatModalProvider() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 bg-primary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold"
      >
        AI
      </button>

      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Ask AIlex</h2>
              <button onClick={() => setIsChatOpen(false)} className="text-2xl">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto">
              <ChatWindow />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
