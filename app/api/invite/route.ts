import { NextResponse } from "next/server";
import { rateLimit, getClientId } from "@/lib/rateLimit";

export const runtime = "edge";

/**
 * POST /api/invite
 * Generates a short invite using OpenAI Chat Completion.
 * Optional body: { style?: string } to add extra style hints to the prompt.
 */
export async function POST(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`invite:${id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
  }

  let style = "";
  try {
    const body = await req.json();
    style = body?.style ? String(body.style) : "";
  } catch {
    // ignore invalid json / empty body
  }

  // Guardrails: trim and cap style length
  style = style.replace(/\s+/g, " ").trim().slice(0, 200);

  const prompt =
    "Write a warm, 2-3 sentence message an existing member of an AI club can text or email to friends inviting them to join." +
    " Tone: upbeat, inclusive, a dash of geeky excitement—but do not imply the sender founded the club." +
    " End with the link https://gayiclub.com." +
    (style ? ` ${style}` : "");

  const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!apiRes.ok) {
    const error = await apiRes.text();
    console.error("OpenAI error", error);
    return NextResponse.json(
      { error: "Couldn't generate invite, please try again." },
      { status: 500 }
    );
  }

  const data = await apiRes.json();
  const message = data.choices?.[0]?.message?.content?.trim();
  return NextResponse.json({ message });
}
