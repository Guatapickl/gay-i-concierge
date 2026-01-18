import { NextResponse } from "next/server";
import { rateLimit, getClientId } from "@/lib/rateLimit";
import { getUpcomingEvents } from "@/lib/events";

type ChatMessage = { role: string; content: string };

export const runtime = "edge";

export async function POST(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`chat:${id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const messages = (typeof body === 'object' && body !== null && 'messages' in body)
    ? (body as { messages?: ChatMessage[] }).messages
    : undefined;

  // Basic validation and guardrails
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "'messages' must be an array" }, { status: 400 });
  }
  if (messages.length > 30) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }
  const totalChars = messages.reduce((n: number, m: ChatMessage) => n + ((m?.content?.length) || 0), 0);
  if (totalChars > 6000) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
  }

  // Enrich context with a brief list of upcoming events for recommendations
  let systemPrefix = '';
  try {
    const upcoming = await getUpcomingEvents();
    const top = upcoming.slice(0, 5).map(e => `- ${e.title} — ${new Date(e.event_datetime).toLocaleString()}${e.location ? ` @ ${e.location}` : ''}`);
    if (top.length) {
      systemPrefix = `You are the Gay I Club concierge. When helpful, recommend relevant upcoming events based on the user's interests. Upcoming events (top ${top.length}):\n${top.join('\n')}`;
    }
  } catch {
    // ignore failures to load events
  }

  const enriched = systemPrefix
    ? [{ role: "system", content: systemPrefix }, ...messages]
    : messages;

  const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4o",
      messages: enriched,
      stream: true,
    }),
  });

  if (!apiRes.ok) {
    const error = await apiRes.text();
    return new Response(error, { status: apiRes.status });
  }

  return new Response(apiRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
