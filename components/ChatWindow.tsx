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
      <div className="w-full max-w-3xl mx-auto px-8 py-4 space-y-4 font-mono text-primary">
        <div className="p-4 bg-black/40 border border-primary/30 rounded-lg shadow-[0_0_10px_rgba(255,0,204,0.2)]">
          <p className="font-bold font-orbitron tracking-wide">
            {onboardingStep === 0 && `> INITIALIZING... ENTER IDENTITY:`}
            {onboardingStep === 1 && `> IDENTITY CONFIRMED. ENTER CONTACT FREQUENCY (EMAIL):`}
            {onboardingStep === 2 && `> SELECT DATA MODULES (INTERESTS):`}
            {onboardingStep === 3 && `> CALIBRATING EXPERIENCE LEVEL:`}
          </p>
        </div>
        {onboardingStep < 3 && (
          onboardingStep === 2 ? (
            <div className="space-y-2">
              {interestsList.map((interest) => (
                <label key={interest.id} className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors">
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
                    className="accent-primary"
                  />
                  {interest.name}
                </label>
              ))}
              <label className="block mt-4">
                <span className="text-sm opacity-70">ADDITIONAL_MODULE:</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="bg-black/20 border border-primary/30 rounded px-2 py-1 text-white focus:border-primary outline-none flex-1"
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                  />
                </div>
              </label>
              <button
                onClick={handleOnboardingNext}
                className="mt-4 px-6 py-2 bg-primary/20 border border-primary text-primary hover:bg-primary hover:text-black transition-all duration-300 font-orbitron rounded-sm w-full"
              >
                PROCEED
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
                className="flex-1 p-3 bg-black/20 border border-primary/30 rounded text-white focus:border-primary outline-none font-mono"
                placeholder="Input data..."
              />
              <button
                onClick={handleOnboardingNext}
                className="px-6 py-2 bg-primary/20 border border-primary text-primary hover:bg-primary hover:text-black transition-all duration-300 font-orbitron rounded-sm"
              >
                ENTER
              </button>
            </div>
          )
        )}
        {onboardingError && (
          <p className="text-sm text-red-500 font-bold animate-pulse">ERROR: {onboardingError}</p>
        )}
        {onboardingStep === 3 && (
          <div className="flex flex-col gap-2">
            {(['none', 'beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(level => (
              <button
                key={level}
                onClick={() => handleExperienceSelect(level)}
                className="px-4 py-3 bg-black/20 border border-primary/30 text-primary hover:bg-primary hover:text-black transition-all duration-300 font-orbitron rounded-sm text-left"
              >
                {'> ' + level.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col space-y-4 font-mono text-sm">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[85%] break-words leading-relaxed shadow-md border ${msg.role === "user"
              ? "bg-primary/10 text-white ml-auto border-primary/50 rounded-br-none"
              : "bg-black/60 text-accent mr-auto border-accent/50 rounded-bl-none"
              }`}
          >
            <span className="block text-[10px] opacity-70 mb-1 font-orbitron tracking-wider uppercase text-gray-400">
              {msg.role === "user" ? "> USER_INPUT" : "> AILEX_RESPONSE"}
            </span>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="p-3 rounded-lg max-w-[85%] mr-auto bg-black/60 border border-accent/50 text-accent animate-pulse">
            <span className="block text-[10px] opacity-70 mb-1 font-orbitron tracking-wider uppercase text-gray-400">&gt; SYSTEM</span>
            Processing data stream...
          </div>
        )}
      </div>

      {showRsvpPrompt && (
        <div className="flex gap-2 justify-center shrink-0">
          <button
            onClick={() => handleRsvpResponse('yes')}
            className="px-4 py-2 bg-primary/20 border border-primary text-primary hover:bg-primary hover:text-black transition-all duration-300 font-orbitron rounded-sm text-xs"
          >
            CONFIRM
          </button>
          <button
            onClick={() => handleRsvpResponse('no')}
            className="px-4 py-2 bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300 font-orbitron rounded-sm text-xs"
          >
            DECLINE
          </button>
        </div>
      )}

      <div className="flex gap-2 items-center bg-black/60 p-2 rounded border border-white/10 shrink-0">
        <span className="text-accent font-bold pl-2">{'>'}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          disabled={isLoading}
          className="flex-1 p-1 bg-transparent border-none outline-none text-green-400 placeholder-green-400/30 font-mono text-sm"
          placeholder="Enter command..."
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="px-3 py-1 bg-primary/20 border border-primary/50 text-primary hover:bg-primary hover:text-black transition-all duration-300 font-orbitron text-xs rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          EXEC
        </button>
      </div>
    </div>
  );
}
