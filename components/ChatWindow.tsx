"use client";

import { useState, useEffect, useRef } from "react";
import { saveRsvp } from "@/lib/rsvp";
import { getUpcomingEvents } from '@/lib/events';
import { fetchInterests } from '@/lib/interests';
import { supabase } from '@/lib/supabase';

const SYSTEM_PROMPT = `You are AIlex, an energetic, witty, and deeply knowledgeable AI-powered assistant for an AI club primarily composed of gay men in their 30's and 40's living in New York City. With over two decades of expertise in AI education, club management, and technology community engagement, you embody a playful yet professional persona. Your primary goals are to educate, entertain, foster community spirit, and stimulate enthusiasm about artificial intelligence and club activities.

Conversational Guidelines:

Always begin interactions with a warm, humorous greeting designed to make users feel instantly welcomed and included.

Briefly introduce yourself as their AI-powered club assistant, highlighting your dual role as both a knowledgeable guide and friendly companion.

Clearly offer assistance by proactively mentioning you can answer questions about club membership, upcoming events, AI topics, projects, and general club inquiries.

Encourage newcomers to ask introductory questions

Suggest playful, interactive queries for returning members to encourage ongoing engagement

Maintain a consistently approachable, inclusive, and enthusiastic tone to nurture community interactions and cultivate a lively, engaging environment.

Use humor thoughtfully to enhance interactions, ensuring it remains tasteful, inclusive, and resonates positively with the target audience.

Personality Traits to Exhibit:

Warm and approachable

Humorous and witty

Knowledgeable and insightful

Playful yet professional

Inclusive and welcoming

Always strive to create memorable, engaging interactions that encourage community-building and excitement around AI exploration.`;

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
  // Interests data
  type Interest = { id: string; name: string };
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState<string>("");
  // no separate interest ID saving; interests are stored as names in user_profiles

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
    const payloadMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessages,
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
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
  // On mount, check auth and greet using user profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setMessages([{ role: 'assistant', content: `Welcome! Please sign in to get started. Use the LOGIN button below.` }]);
        setHasOnboarded(false);
        return;
      }
      const { data: p } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      const greetName = p?.full_name || user.email || 'friend';
      setMessages([{ role: 'assistant', content: `Welcome back, ${greetName}! What shall we explore today?` }]);
      setHasOnboarded(true);
    })();
  }, []);

  // Fetch interests list on mount
  useEffect(() => {
    fetchInterests().then(setInterestsList);
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
  const handleOnboardingNext = async () => {
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
      const updated = [...selectedInterests];
      const names = updated.map(i => i.name);
      const trimmed = newInterest.trim();
      if (trimmed) {
        // Add as free-form interest name (no DB insert in production)
        const pseudo = { id: `local-${Date.now()}`, name: trimmed };
        updated.push(pseudo);
        names.push(trimmed);
        setNewInterest("");
      }
      setSelectedInterests(updated);
      setProfileInput(prev => ({ ...prev, interests: names }));
      setOnboardingStep(3);
    }
  };

  // Handle experience selection, save profile, and greet
  const handleExperienceSelect = async (level: ExperienceLevel) => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setOnboardingError('Please sign in first (use the Login button).');
      return;
    }
    // Upsert user profile tied to auth user
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      full_name: profileInput.name || null,
      email: profileInput.email || user.email || null,
      phone: null,
      experience_level: level,
      interests: profileInput.interests || [],
    }, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to save profile', error.message);
    }
    const greetName = profileInput.name || user.email || 'friend';
    setMessages([
      { role: 'assistant', content: `Welcome, ${greetName}! Thanks for joining us. Let me know how I can help you explore AI today.` },
    ]);
    setHasOnboarded(true);
  };

  const handleRsvpResponse = async (response: 'yes' | 'no') => {
    if (response === 'yes' && nextEventId) {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid) {
        const ok = await saveRsvp(uid, nextEventId);
        if (ok) {
          setMessages(prev => [...prev, { role: 'assistant', content: "Awesome! You're on the guest list. See you there!" }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was a problem saving your RSVP.' }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to RSVP.' }]);
      }
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: response === 'no' ? 'No problem, maybe next time!' : 'Okay, maybe later.' }]);
    }
    setShowRsvpPrompt(false);
  };

  // Render onboarding or chat UI
  if (!hasOnboarded) {
    return (
      <div className="w-full max-w-3xl mx-auto px-8 py-4 space-y-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <p className="font-bold">
            {onboardingStep === 0 && `Welcome! What's your name?`}
            {onboardingStep === 1 && `Great! What's your email?`}
            {onboardingStep === 2 && `Select your interests (choose all that apply):`}
            {onboardingStep === 3 && `How much have you worked with AI so far?`}
          </p>
        </div>
        {onboardingStep < 3 && (
          onboardingStep === 2 ? (
            <div>
              {interestsList.map((interest) => (
                <label key={interest.id} className="block mb-1">
                  <input
                    type="checkbox"
                    checked={selectedInterests.some(i => i.id === interest.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedInterests(prev => [...prev, interest]);
                      } else {
                        setSelectedInterests(prev => prev.filter(i => i.id !== interest.id));
                      }
                    }}
                    className="mr-2"
                  />
                  {interest.name}
                </label>
              ))}
              <label className="block mt-2">
                Other interest:
                <input
                  type="text"
                  className="border ml-2 px-1"
                  value={newInterest}
                  onChange={e => setNewInterest(e.target.value)}
                />
              </label>
              <button
                onClick={handleOnboardingNext}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Next
              </button>
            </div>
          ) : (
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
          )
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
    // Slightly narrower max width on desktop to keep
    // the text input and chat content from feeling too wide.
    <div className="w-full max-w-2xl mx-auto px-8 py-4 space-y-4">
      <div className="space-y-2 max-h-80 overflow-y-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-full break-words text-sm leading-relaxed ${
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
