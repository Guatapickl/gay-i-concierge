import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
vi.mock('@/lib/firebase/authClient', () => ({ currentUser: async () => null, authHeader: async () => ({ Authorization: 'Bearer member-token' }) }));
import { submitBallot } from '@/lib/polls';

afterEach(() => vi.unstubAllGlobals());
describe('complete ballot submission', () => {
  it('submits an all-unavailable ballot through the authenticated server endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await submitBallot('poll', { availableOptionIds: [], unavailableOptionIds: ['a', 'b'] });
    expect(fetchMock).toHaveBeenCalledWith('/api/polls/poll/ballot', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer member-token' },
      body: JSON.stringify({ availableOptionIds: [], unavailableOptionIds: ['a', 'b'] }),
    });
  });
  it('surfaces expired ballot rejection without reporting a successful save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Voting has closed.' }) }));
    await expect(submitBallot('poll', { availableOptionIds: ['b'], unavailableOptionIds: ['a'] })).rejects.toThrow('Voting has closed.');
  });
});
