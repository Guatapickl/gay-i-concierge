import { NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import type { AgendaItem } from '@/types/supabase';

export const runtime = 'edge';

/**
 * Generate a draft agenda for an event from a brief description. Returns
 * `{ items: AgendaItem[] }` so the client can drop it straight into the
 * AgendaEditor and let the user edit from there.
 */
export async function POST(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`agenda:${id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  let body: { title?: string; description?: string; durationMinutes?: number; startTime?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { title = '', description = '', durationMinutes = 90, startTime = '' } = body;
  if (!title.trim() && !description.trim()) {
    return NextResponse.json({ error: 'title or description required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });

  const prompt = `Draft an agenda for the following AI club meeting. Return JSON only.

Meeting title: ${title}
Description: ${description}
Total duration: ${durationMinutes} minutes
${startTime ? `Start time: ${startTime}` : ''}

Constraints:
- 4 to 7 agenda items, each clearly time-boxed.
- Use times relative to the start time when provided (e.g. "6:00 PM").
- Always include a welcome/intros opener and a closing/wrap-up segment.
- Mix talks, demos, hands-on, and discussion as the topic warrants.
- Speakers are optional; use null when unknown.

Schema:
{ "items": [ { "time": string|null, "title": string, "speaker": string|null, "notes": string|null } ] }`;

  const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write concise agendas for tech community meetings. Always return strict JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  if (!apiRes.ok) {
    const err = await apiRes.text();
    return NextResponse.json({ error: err }, { status: apiRes.status });
  }
  const json = await apiRes.json();
  const text = json?.choices?.[0]?.message?.content || '{}';
  let parsed: { items?: AgendaItem[] } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'model returned non-JSON' }, { status: 502 });
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return NextResponse.json({ items });
}
