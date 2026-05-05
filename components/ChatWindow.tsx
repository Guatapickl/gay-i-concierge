"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ChevronDown, Sparkles } from "lucide-react";
import { saveRsvp } from "@/lib/rsvp";
import { getUpcomingEvents } from "@/lib/events";
import { fetchInterests } from "@/lib/interests";
import { supabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type ExperienceLevel = "none" | "beginner" | "intermediate" | "advanced";
type ProfileInput = { name: string; email: string; interests: string[] };
type Interest = { id: string; name: string };
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

/* ------------------------------------------------------------------ */
/*  System prompt                                                      */
/* ------------------------------------------------------------------ */
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

Always strive to create memorable, engaging interactions that encourage community-building and excitement around AI exploration.

Format your responses using markdown when appropriate — use **bold**, *italic*, bullet lists, and headings for clarity. Keep responses concise and scannable.`;

/* ------------------------------------------------------------------ */
/*  Quick-action suggestion chips                                      */
/* ------------------------------------------------------------------ */
const SUGGESTION_CHIPS = [
  { label: "What's next?", prompt: "What upcoming events should I know about?" },
  { label: "Explain AI", prompt: "Can you explain a trending AI topic in simple terms?" },
  { label: "Club info", prompt: "Tell me about the Gay I Club and how to get involved." },
  { label: "Project ideas", prompt: "Suggest a fun AI project I could work on with the club." },
];

/* ------------------------------------------------------------------ */
/*  Simple markdown renderer                                           */
/* ------------------------------------------------------------------ */
function renderMarkdown(text: string): string {
  let html = text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="chat-code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Headers
    .replace(/^### (.+)$/gm, '<div class="chat-h3">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="chat-h2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="chat-h1">$1</div>')
    // Unordered lists
    .replace(/^[•\-\*] (.+)$/gm, '<li class="chat-li">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="chat-li chat-li-ordered">$1</li>')
    // Line breaks
    .replace(/\n/g, "<br />");

  // Wrap consecutive <li> items
  html = html.replace(
    /(<li class="chat-li">[\s\S]*?<\/li>(\s*<br \/>)?)+/g,
    (match) => `<ul class="chat-ul">${match.replace(/<br \/>/g, "")}</ul>`
  );

  return html;
}

/* ------------------------------------------------------------------ */
/*  Typing indicator                                                   */
/* ------------------------------------------------------------------ */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 mr-auto max-w-[85%] animate-fade-in">
      <div className="chat-avatar-ai shrink-0">AI</div>
      <div className="chat-bubble-assistant">
        <div className="flex items-center gap-1.5">
          <span className="chat-typing-dot" style={{ animationDelay: "0ms" }} />
          <span className="chat-typing-dot" style={{ animationDelay: "150ms" }} />
          <span className="chat-typing-dot" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message bubble                                                     */
/* ------------------------------------------------------------------ */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div className="flex items-end gap-2.5 ml-auto max-w-[85%] animate-slide-up">
        <div className="flex flex-col items-end gap-1">
          <div className="chat-bubble-user">
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
          </div>
          <span className="text-[10px] text-foreground-faint px-1">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5 mr-auto max-w-[85%] animate-slide-up">
      <div className="chat-avatar-ai shrink-0">AI</div>
      <div className="flex flex-col gap-1">
        <div className="chat-bubble-assistant">
          <div
            className="text-sm leading-relaxed chat-markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        </div>
        <span className="text-[10px] text-foreground-faint px-1">{time}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [profileInput, setProfileInput] = useState<ProfileInput>({
    name: "",
    email: "",
    interests: [],
  });
  const [tempInput, setTempInput] = useState<string>("");
  const [onboardingError, setOnboardingError] = useState<string>("");
  const [showRsvpPrompt, setShowRsvpPrompt] = useState<boolean>(false);
  const [nextEventId, setNextEventId] = useState<string | null>(null);
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState<string>("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const currentRequest = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll */
  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length > 1);
  }, [messages, isLoading, scrollToBottom]);

  /* Scroll sentinel */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  /* Send message */
  async function sendMessage(overrideText?: string) {
    const text = overrideText || input;
    if (!text.trim()) return;
    currentRequest.current?.abort();

    const userMsg: ChatMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setShowSuggestions(false);

    const controller = new AbortController();
    currentRequest.current = controller;
    const payloadMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessages.map((m) => ({ role: m.role, content: m.content })),
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
      const assistantTs = Date.now();

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
              setMessages([
                ...newMessages,
                { role: "assistant", content: assistantReply, timestamp: assistantTs },
              ]);
            }
          } catch (err) {
            console.error("Failed to parse chunk", err, line);
          }
        }
      }
    } catch (err) {
      const isAbort =
        !!err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "AbortError";
      if (!isAbort) {
        console.error("Chat request failed", err);
        const errMsg: ChatMessage = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        };
        setMessages([...newMessages, errMsg]);
      }
    } finally {
      setIsLoading(false);
      if (currentRequest.current === controller) {
        currentRequest.current = null;
      }
      inputRef.current?.focus();
    }
  }

  /* Bootstrap */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setMessages([
          {
            role: "assistant",
            content: "Hey there! 👋 Welcome to **Gay I Club NYC**. Please sign in to get started with your AI concierge experience.",
            timestamp: Date.now(),
          },
        ]);
        setHasOnboarded(false);
        return;
      }
      const { data: p } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const greetName = p?.full_name || user.email || "friend";
      setMessages([
        {
          role: "assistant",
          content: `Welcome back, **${greetName}**! 🌟 I'm AIlex, your club concierge. What shall we explore today?`,
          timestamp: Date.now(),
        },
      ]);
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
      const lastPrompted = localStorage.getItem("last_prompted_event_id");
      if (lastPrompted === next.id) return;

      setShowRsvpPrompt(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `🎟️ **Upcoming Event Alert!**\n\nWould you like to RSVP for our next event:\n\n**"${next.title}"**\n📅 ${new Date(next.event_datetime).toLocaleString()}`,
          timestamp: Date.now(),
        },
      ]);
      localStorage.setItem("last_prompted_event_id", next.id);
      setNextEventId(next.id);
    })();
  }, [hasOnboarded]);

  /* Onboarding handlers */
  const handleOnboardingNext = async () => {
    if (onboardingStep === 0) {
      const name = tempInput.trim();
      if (!name || name.length < 2) {
        setOnboardingError("Please enter your name (2+ characters).");
        return;
      }
      setOnboardingError("");
      setProfileInput((prev) => ({ ...prev, name }));
      setTempInput("");
      setOnboardingStep(1);
    } else if (onboardingStep === 1) {
      const email = tempInput.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        setOnboardingError("Please enter a valid email.");
        return;
      }
      setOnboardingError("");
      setProfileInput((prev) => ({ ...prev, email }));
      setTempInput("");
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      const updated = [...selectedInterests];
      const names = updated.map((i) => i.name);
      const trimmed = newInterest.trim();
      if (trimmed) {
        const pseudo = { id: `local-${Date.now()}`, name: trimmed };
        updated.push(pseudo);
        names.push(trimmed);
        setNewInterest("");
      }
      setSelectedInterests(updated);
      setProfileInput((prev) => ({ ...prev, interests: names }));
      setOnboardingStep(3);
    }
  };

  const handleExperienceSelect = async (level: ExperienceLevel) => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setOnboardingError("Please sign in first.");
      return;
    }
    const { error } = await supabase.from("user_profiles").upsert(
      {
        id: user.id,
        full_name: profileInput.name || null,
        email: profileInput.email || user.email || null,
        phone: null,
        experience_level: level,
        interests: profileInput.interests || [],
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("Failed to save profile", error.message);
    }
    const greetName = profileInput.name || user.email || "friend";
    setMessages([
      {
        role: "assistant",
        content: `Welcome, **${greetName}**! 🎉 Thanks for joining us. I'm AIlex, your AI concierge. Let me know how I can help you explore AI today.`,
        timestamp: Date.now(),
      },
    ]);
    setHasOnboarded(true);
  };

  const handleRsvpResponse = async (response: "yes" | "no") => {
    if (response === "yes" && nextEventId) {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid) {
        const ok = await saveRsvp(uid, nextEventId);
        if (ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "✅ **You're on the list!** See you there. 🎉",
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, there was a problem saving your RSVP. Please try again.",
              timestamp: Date.now(),
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Please sign in to RSVP.", timestamp: Date.now() },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response === "no" ? "No problem, maybe next time! 👋" : "Okay, maybe later.",
          timestamp: Date.now(),
        },
      ]);
    }
    setShowRsvpPrompt(false);
  };

  const experienceLevels: { value: ExperienceLevel; label: string; emoji: string }[] = [
    { value: "none", label: "New to AI", emoji: "🌱" },
    { value: "beginner", label: "Beginner", emoji: "🔰" },
    { value: "intermediate", label: "Intermediate", emoji: "⚡" },
    { value: "advanced", label: "Advanced", emoji: "🚀" },
  ];

  /* ── Onboarding flow ── */
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

          {onboardingStep < 3 &&
            (onboardingStep === 2 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {interestsList.map((interest) => (
                    <label
                      key={interest.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedInterests.some((i) => i.id === interest.id)
                          ? "border-primary bg-primary-subtle text-primary"
                          : "border-border bg-surface hover:border-foreground-subtle text-foreground-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedInterests.some((i) => i.id === interest.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInterests((prev) => [...prev, interest]);
                          } else {
                            setSelectedInterests((prev) =>
                              prev.filter((i) => i.id !== interest.id)
                            );
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm">{interest.name}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-foreground-muted">Other interests:</label>
                  <input
                    type="text"
                    className="input-field w-full"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
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
                  onChange={(e) => setTempInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleOnboardingNext();
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
            ))}

          {onboardingError && <p className="mt-3 text-sm text-danger">{onboardingError}</p>}

          {onboardingStep === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleExperienceSelect(level.value)}
                  className="p-4 text-left bg-surface border border-border rounded-lg hover:border-primary hover:bg-surface-hover transition-all group"
                >
                  <span className="text-xl mb-1 block">{level.emoji}</span>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {level.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Chat interface ── */
  return (
    <div className="chat-container">
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-messages"
      >
        {messages.map((msg, i) => (
          <MessageBubble key={`${msg.timestamp}-${i}`} msg={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        {/* RSVP prompt buttons */}
        {showRsvpPrompt && (
          <div className="flex gap-2 justify-center py-2 animate-scale-in">
            <button
              onClick={() => handleRsvpResponse("yes")}
              className="btn-brand text-sm"
            >
              ✅ Yes, RSVP
            </button>
            <button
              onClick={() => handleRsvpResponse("no")}
              className="px-4 py-2 bg-surface border border-border text-foreground-muted text-sm font-medium rounded-lg hover:bg-surface-hover transition-colors"
            >
              Not this time
            </button>
          </div>
        )}
      </div>

      {/* Scroll-to-bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="chat-scroll-btn"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Suggestion chips */}
      {showSuggestions && messages.length <= 2 && !isLoading && (
        <div className="chat-suggestions">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => sendMessage(chip.prompt)}
              className="chat-chip"
            >
              <Sparkles className="w-3 h-3 shrink-0 text-primary" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
          className="chat-input"
          placeholder="Ask AIlex anything..."
          autoComplete="off"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          className="chat-send-btn"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
