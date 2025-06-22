import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/invite
 * Generates a short quirky invite using OpenAI Chat Completion.
 * Optional body: { style?: string } to add extra style hints to the prompt.
 */
export async function POST(req: Request) {
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

  const prompt =
    "Write a short quirky invite (≤ 3 sentences) that includes the URL https://gayiclub.com." +
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
