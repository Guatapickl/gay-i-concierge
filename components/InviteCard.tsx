"use client";

import { useState } from "react";

/**
 * InviteCard component allows users to generate a short invite message
 * using the /api/invite endpoint and copy it to their clipboard.
 */
export default function InviteCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    setMessage(null);
    setCopied(false);
    const res = await fetch("/api/invite", { method: "POST" });
    if (!res.ok) {
      setMessage(null);
      setLoading(false);
      setMessage("Couldn't generate invite, please try again.");
      return;
    }
    const data = await res.json();
    setMessage(data.message);
    setLoading(false);
  };

  const copyInvite = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="border rounded p-4 space-y-2">
      <button
        onClick={generateInvite}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Invite"}
      </button>
      {message && (
        <div className="space-y-2">
          <p className="whitespace-pre-line">{message}</p>
          <button
            onClick={copyInvite}
            className="text-sm text-blue-600 underline"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
