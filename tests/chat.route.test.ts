import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock events list to avoid Supabase
vi.mock('@/lib/events', () => ({
  getUpcomingEvents: vi.fn().mockResolvedValue([
    { id: '1', title: 'AI 101', event_datetime: new Date('2030-01-01T10:00:00Z').toISOString(), location: 'Room A', description: null, created_at: '' },
  ]),
}));

import { POST as CHAT_POST } from '@/app/api/chat/route';

const realFetch = global.fetch;
const realEnv = { ...process.env };

function sseStream(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) { controller.close(); return; }
      controller.enqueue(encoder.encode(chunks[i++]));
    },
  });
  return stream;
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(process.env, realEnv);
  });
  afterEach(() => {
    global.fetch = realFetch as any;
    Object.assign(process.env, realEnv);
  });

  it('returns 400 for invalid body', async () => {
    process.env.OPENAI_API_KEY = 'x';
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: 'not-json' });
    const res = await CHAT_POST(req as any);
    expect(res.status).toBe(400);
  });

  it('streams SSE response from OpenAI', async () => {
    process.env.OPENAI_API_KEY = 'x';
    global.fetch = vi.fn().mockResolvedValue(
      new Response(sseStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: [DONE]\n',
      ]), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    );

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await CHAT_POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/);
  });
});

