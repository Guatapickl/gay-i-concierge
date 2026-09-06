import { it, expect, vi, afterEach } from 'vitest';
import { POST } from '@/app/api/invite/route';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('provides a usable club invitation without any paid model request', async () => {
  vi.stubEnv('OPENAI_API_KEY', 'test-key');
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const response = await POST();
  expect(response.status).toBe(200);
  expect((await response.json()).message).toContain('https://gayiclub.com');
  expect(fetch).not.toHaveBeenCalled();
});
