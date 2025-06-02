import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 });
  }

  const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
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
    },
  });
}