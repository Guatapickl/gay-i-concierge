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
  const [error, setError] = useState<string | null>(null);

  const generateInvite = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);
    setCopied(false);
    
    try {
      const res = await fetch("/api/invite", { 
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        setError(`Error ${res.status}: ${errorData.error || "Couldn't generate invite"}`);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      setMessage(data.message);
      
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      setError("Network error: Couldn't connect to server");
    } finally {
      setLoading(false);
    }
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
      
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {message && (
        <div className="space-y-2">
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="whitespace-pre-line">{message}</p>
          </div>
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
