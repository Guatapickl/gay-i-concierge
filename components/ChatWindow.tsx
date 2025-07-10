"use client";

import { useState, useEffect } from "react";
import { saveProfile } from "@/lib/profile";
import { saveRsvp } from "@/lib/rsvp";
import { getUpcomingEvents } from '@/lib/events';
import { fetchInterests, findOrCreateInterest, linkUserInterests } from '@/lib/interests';
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
  const [showRsvpPrompt, setShowRsvpPrompt] = useState<boolean>(false);
  const [nextEventId, setNextEventId] = useState<string | null>(null);
  // Interests data
  type Interest = { id: string; name: string };
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [newInterest, setNewInterest] = useState<string>("");
  const [interestIdsToSave, setInterestIdsToSave] = useState<string[]>([]);

  async function sendMessage() {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!res.ok) {
      console.error("Error calling /api/chat", await res.text());
      setIsLoading(false);
      return;
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let assistantReply = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader!.read();
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

    setIsLoading(false);
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
      if (!tempInput.trim()) return;
      setProfileInput(prev => ({ ...prev, name: tempInput.trim() }));
      setTempInput("");
      setOnboardingStep(1);
    } else if (onboardingStep === 1) {
      if (!tempInput.trim()) return;
      setProfileInput(prev => ({ ...prev, email: tempInput.trim() }));
      setTempInput("");
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      const updated = [...selectedInterests];
      const ids = updated.map(i => i.id);
      const names = updated.map(i => i.name);
      const trimmed = newInterest.trim();
      if (trimmed) {
        const created = await findOrCreateInterest(trimmed);
        if (created) {
          updated.push(created);
          ids.push(created.id);
          names.push(created.name);
          setInterestsList(prev => [...prev, created]);
        }
        setNewInterest("");
      }
      setSelectedInterests(updated);
      setInterestIdsToSave(ids);
      setProfileInput(prev => ({ ...prev, interests: names }));
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
    } else {
      await linkUserInterests(id, interestIdsToSave);
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
            className={`p-2 rounded ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
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
