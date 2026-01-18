"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Check } from "lucide-react";
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
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [profileInput, setProfileInput] = useState<ProfileInput>({ name: "", email: "", interests: [] });
  const [tempInput, setTempInput] = useState<string>("");
  const [onboardingError, setOnboardingError] = useState<string>("");
  const [showRsvpPrompt, setShowRsvpPrompt] = useState<boolean>(false);
  const [nextEventId, setNextEventId] = useState<string | null>(null);
  type Interest = { id: string; name: string };
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState<string>("");

  const currentRequest = useRef<AbortController | null>(null);

  async function sendMessage() {
    if (!input.trim()) return;
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setMessages([{ role: 'assistant', content: `Welcome! Please sign in to get started.` }]);
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

  useEffect(() => {
    fetchInterests().then(setInterestsList);
  }, []);

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

  const handleExperienceSelect = async (level: ExperienceLevel) => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setOnboardingError('Please sign in first.');
      return;
    }
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
          setMessages(prev => [...prev, { role: 'assistant', content: "You're on the list! See you there." }]);
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

  const experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'none', label: 'New to AI' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  if (!hasOnboarded) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="card-elevated p-6">
          <p className="text-lg font-display font-medium text-foreground mb-1">
            {onboardingStep === 0 && "What's your name?"}
            {onboardingStep === 1 && "What's your email?"}
            {onboardingStep === 2 && "What interests you?"}
            {onboardingStep === 3 && "What's your AI experience?"}
          </p>
          <p className="text-sm text-foreground-muted mb-4">
            {onboardingStep === 0 && "Help us personalize your experience"}
            {onboardingStep === 1 && "We'll use this to keep you updated"}
            {onboardingStep === 2 && "Select topics you'd like to explore"}
            {onboardingStep === 3 && "This helps us tailor content for you"}
          </p>

          {onboardingStep < 3 && (
            onboardingStep === 2 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {interestsList.map((interest) => (
                    <label
                      key={interest.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedInterests.some(i => i.id === interest.id)
                          ? 'border-primary bg-primary-subtle text-primary'
                          : 'border-border bg-surface hover:border-foreground-subtle text-foreground-muted'
                      }`}
                    >
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
                        className="sr-only"
                      />
                      <span className="text-sm">{interest.name}</span>
                      {selectedInterests.some(i => i.id === interest.id) && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">Other interests:</label>
                  <input
                    type="text"
                    className="input-field w-full"
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                    placeholder="Add your own..."
                  />
                </div>
                <button
                  onClick={handleOnboardingNext}
                  className="w-full px-4 py-3 bg-primary text-background font-medium rounded-lg hover:bg-primary-muted transition-colors"
                >
                  Continue
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
                  className="input-field flex-1"
                  placeholder={onboardingStep === 0 ? "Your name" : "your@email.com"}
                />
                <button
                  onClick={handleOnboardingNext}
                  className="px-6 py-2.5 bg-primary text-background font-medium rounded-lg hover:bg-primary-muted transition-colors"
                >
                  Next
                </button>
              </div>
            )
          )}

          {onboardingError && (
            <p className="mt-3 text-sm text-danger">{onboardingError}</p>
          )}

          {onboardingStep === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {experienceLevels.map(level => (
                <button
                  key={level.value}
                  onClick={() => handleExperienceSelect(level.value)}
                  className="p-4 text-left bg-surface border border-border rounded-lg hover:border-primary hover:bg-surface-hover transition-all"
                >
                  <span className="text-sm font-medium text-foreground">{level.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl max-w-[85%] ${
              msg.role === "user"
                ? "bg-primary text-background ml-auto"
                : "bg-surface border border-border mr-auto"
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="p-4 rounded-xl max-w-[85%] bg-surface border border-border mr-auto">
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {showRsvpPrompt && (
        <div className="flex gap-2 justify-center shrink-0">
          <button
            onClick={() => handleRsvpResponse('yes')}
            className="px-4 py-2 bg-primary text-background text-sm font-medium rounded-lg hover:bg-primary-muted transition-colors"
          >
            Yes, RSVP
          </button>
          <button
            onClick={() => handleRsvpResponse('no')}
            className="px-4 py-2 bg-surface border border-border text-foreground-muted text-sm font-medium rounded-lg hover:bg-surface-hover transition-colors"
          >
            Not this time
          </button>
        </div>
      )}

      <div className="flex gap-2 items-center bg-surface border border-border rounded-xl p-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-transparent border-none outline-none text-foreground placeholder:text-foreground-subtle text-sm"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-primary text-background rounded-lg hover:bg-primary-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
