import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/lib/email';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('email transport', () => {
  it('passes provider idempotency as an HTTP header, not a message header', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test');
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":"sent"}', { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    await sendEmail({ to: 'a@example.com', subject: 'Vote', html: 'Hello', idempotencyKey: 'queue/1' });
    const options = fetcher.mock.calls[0][1];
    expect(options.headers['Idempotency-Key']).toBe('queue/1');
    expect(JSON.parse(options.body).headers).toBeUndefined();
  });
  it('aborts stalled delivery within 15 seconds and returns a retryable failure', async () => {
    vi.useFakeTimers(); vi.stubEnv('RESEND_API_KEY', 'test');
    vi.stubGlobal('fetch', vi.fn((_url, opts) => new Promise((_resolve, reject) => opts.signal.addEventListener('abort', () => reject(new Error('Timed out'))))));
    const result = sendEmail({ to: 'a@example.com', subject: 'Vote', html: 'Hello' });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await result).toEqual({ ok: false, error: 'Timed out' });
  });
});
