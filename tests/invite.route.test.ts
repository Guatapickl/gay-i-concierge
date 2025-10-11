import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Route under test
import { POST as INVITE_POST } from '@/app/api/invite/route';

const realFetch = global.fetch;
const realEnv = { ...process.env };

describe('POST /api/invite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(process.env, realEnv);
  });
  afterEach(() => {
    global.fetch = realFetch as any;
    Object.assign(process.env, realEnv);
  });

  it('returns 500 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const req = new Request('http://localhost/api/invite', { method: 'POST', body: '{}' });
    const res = await INVITE_POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Missing OpenAI API key/);
  });

  it('proxies to OpenAI and returns message', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    const fake = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'Hello Invite!' } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    global.fetch = fake as any;

    const req = new Request('http://localhost/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: 'Make it fabulous.' }),
    });
    const res = await INVITE_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Hello Invite!');

    // Ensure correct OpenAI endpoint was called
    expect(fake).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

