"use client";

import { useState, useEffect, useRef } from "react";
import { saveProfile } from "@/lib/profile";
import { saveRsvp } from "@/lib/rsvp";
import { getUpcomingEvents } from '@/lib/events';
import { Profile } from "@/types/supabase";

export default function ChatWindow() {
  type ExperienceLevel = 'none' | 'beginner' | 'intermediate' | 'advanced';
  type ProfileInput = { name: string; email: string; interests: string[] };
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Onboarding state
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [profileInput, setProfileInput] = useState<ProfileInput>({ name: "", email: "", interests: [] });
  // experienceLevel state not needed; handle directly on selection
  const [tempInput, setTempInput] = useState<string>("");
  const [onboardingError, setOnboardingError] = useState<string>("");
  const [showRsvpPrompt, setShowRsvpPrompt] = useState<boolean>(false);
  const [nextEventId, setNextEventId] = useState<string | null>(null);

  // Keep an abort controller to stop previous in-flight requests
  const currentRequest = useRef<AbortController | null>(null);

  async function sendMessage() {
    if (!input.trim()) return;
    // Abort any previous stream
    currentRequest.current?.abort();

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    currentRequest.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error("Error calling /api/chat", await res.text());
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        console.error("No response body to read");
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantReply = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            buffer = "";
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantReply += content;
              // Update once per chunk; could throttle further if needed
              setMessages([...newMessages, { role: "assistant", content: assistantReply }]);
            }
          } catch (err) {
            console.error("Failed to parse chunk", err, line);
          }
        }
      }
    } catch (err) {
      const isAbort = !!(err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError');
      if (!isAbort) {
        console.error("Chat request failed", err);
      }
    } finally {
      setIsLoading(false);
      if (currentRequest.current === controller) {
        currentRequest.current = null;
      }
    }
  }
  // On mount, check for existing profile
  useEffect(() => {
    const id = localStorage.getItem('profile_id');
    const name = localStorage.getItem('profile_name');
    if (id && name) {
      setMessages([
        { role: 'assistant', content: `Welcome back, ${name}! Let me know what you're working on or if you want to explore something new.` },
      ]);
      setHasOnboarded(true);
    }
  }, []);

  // After onboarding, prompt for RSVP for the next event if not already prompted
  useEffect(() => {
    if (!hasOnboarded) return;
    (async () => {
      const events = await getUpcomingEvents();
      if (events.length === 0) return;
      const next = events[0];
      const lastPrompted = localStorage.getItem('last_prompted_event_id');
      if (lastPrompted === next.id) return;

      setShowRsvpPrompt(true);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Would you like to RSVP for our next event: "${next.title}" on ${new Date(next.event_datetime).toLocaleString()}?`,
        },
      ]);
      localStorage.setItem('last_prompted_event_id', next.id);
      setNextEventId(next.id);
    })();
  }, [hasOnboarded]);

  // Handle onboarding steps for name, email, interests
  const handleOnboardingNext = () => {
    if (onboardingStep === 0) {
      const name = tempInput.trim();
      if (!name || name.length < 2) {
        setOnboardingError('Please enter your name (2+ characters).');
        return;
      }
      setOnboardingError('');
      setProfileInput(prev => ({ ...prev, name }));
      setTempInput("");
      setOnboardingStep(1);
    } else if (onboardingStep === 1) {
      const email = tempInput.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        setOnboardingError('Please enter a valid email.');
        return;
      }
      setOnboardingError('');
      setProfileInput(prev => ({ ...prev, email }));
      setTempInput("");
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      const interestsArray = tempInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map(s => s.slice(0, 30));
      if (interestsArray.length === 0) {
        setOnboardingError('Please add at least one interest (comma-separated).');
        return;
      }
      setOnboardingError('');
      setProfileInput(prev => ({ ...prev, interests: interestsArray }));
      setTempInput("");
      setOnboardingStep(3);
    }
  };

  // Handle experience selection, save profile, and greet
  const handleExperienceSelect = async (level: ExperienceLevel) => {
    const newProfile: Omit<Profile, 'id' | 'created_at'> = {
      name: profileInput.name,
      email: profileInput.email,
      interests: profileInput.interests,
      experienceLevel: level,
    };
    const id = await saveProfile(newProfile);
    if (!id) {
      console.warn('Failed to save profile, proceeding without confirmation.');
    }
    // Persist profile locally for future visits
    if (id) {
      localStorage.setItem('profile_id', id);
      localStorage.setItem('profile_name', newProfile.name ?? '');
    }
    // Greet the user and finish onboarding
    setMessages([
      { role: 'assistant', content: `Welcome, ${newProfile.name}! Thanks for joining us. Let me know how I can help you explore AI today.` },
    ]);
    setHasOnboarded(true);
  };

  const handleRsvpResponse = async (response: 'yes' | 'no') => {
    if (response === 'yes' && nextEventId) {
      const profileId = localStorage.getItem('profile_id');
      if (profileId) {
        const ok = await saveRsvp(profileId, nextEventId);
        if (ok) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Awesome! You're on the guest list. See you there!" }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was a problem saving your RSVP.' }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please create a profile first to RSVP.' }]);
      }
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: response === 'no' ? 'No problem, maybe next time!' : 'Okay, maybe later.' }]);
    }
    setShowRsvpPrompt(false);
  };

  // Render onboarding or chat UI
  if (!hasOnboarded) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <p className="font-bold">
            {onboardingStep === 0 && `Welcome! What's your name?`}
            {onboardingStep === 1 && `Great! What's your email?`}
            {onboardingStep === 2 && `What are your interests? (comma-separated)`}
            {onboardingStep === 3 && `How much have you worked with AI so far?`}
          </p>
        </div>
        {onboardingStep < 3 && (
          <div className="flex gap-2">
            <input
              value={tempInput}
              onChange={e => setTempInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleOnboardingNext();
              }}
              className="flex-1 p-2 border rounded"
              placeholder="Type your answer and press Enter..."
            />
            <button
              onClick={handleOnboardingNext}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          </div>
        )}
        {onboardingError && (
          <p className="text-sm text-red-600">{onboardingError}</p>
        )}
        {onboardingStep === 3 && (
          <div className="flex flex-col gap-2">
            {(['none', 'beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(level => (
              <button
                key={level}
                onClick={() => handleExperienceSelect(level)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {showRsvpPrompt && (
        <div className="flex gap-2">
          <button
            onClick={() => handleRsvpResponse('yes')}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Yes
          </button>
          <button
            onClick={() => handleRsvpResponse('no')}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            No thanks
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          disabled={isLoading}
          className="flex-1 p-2 border rounded"
          placeholder="Ask the concierge..."
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
