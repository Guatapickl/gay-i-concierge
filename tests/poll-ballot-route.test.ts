import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ userFromRequest: mocks.user }));
vi.mock('@/lib/poll-ballots', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/poll-ballots')>()), savePollBallot: mocks.save }));
import { POST } from '@/app/api/polls/[id]/ballot/route';
const context = { params: Promise.resolve({ id: 'p' }) };
const request = (body: unknown) => new Request('http://localhost/api/polls/p/ballot', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ uid: 'authenticated-member' });
  mocks.save.mockResolvedValue({ ok: true });
});
describe('ballot API identity and input boundary', () => {
  it('rejects unauthenticated writes', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST(request({}), context)).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('uses verified identity even when the payload claims another member', async () => {
    const ballot = { userId: 'other-member', availableOptionIds: [], unavailableOptionIds: ['a'] };
    expect((await POST(request(ballot), context)).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith('p', 'authenticated-member', ballot);
  });
  it('rejects invalid JSON without calling the ballot transaction', async () => {
    const malformed = new Request('http://localhost/api/polls/p/ballot', { method: 'POST', body: '{' });
    expect((await POST(malformed, context)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects oversized input without calling the ballot transaction', async () => {
    expect((await POST(request({ padding: 'x'.repeat(20001) }), context)).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
