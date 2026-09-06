import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from '@/app/api/chat/route';
describe('paused AIlex', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('blocks old clients and makes no upstream requests even with a configured key', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'AILEX_DISABLED' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
