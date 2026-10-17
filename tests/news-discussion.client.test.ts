import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
vi.mock('@/lib/firebase/authClient', () => ({
  authHeader: async () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
}));

import { fetchNewsDiscussion, NewsDiscussionRequestError, saveNewsDiscussionVote } from '@/lib/news-discussion-client';

describe('news discussion browser helper', () => {
  const realFetch = global.fetch;
  beforeEach(() => { auth.token = null; global.fetch = realFetch; });

  it('does not call the API when signed out and reports 401 instead of an empty result', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchNewsDiscussion({ ids: ['a'] })).rejects.toMatchObject({ status: 401 });
    await expect(saveNewsDiscussionVote('a', true)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the bearer token, the ids filter and the agenda flag, and never caches', async () => {
    auth.token = 'id-token';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ articles: [], generated_at: 'now' }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await fetchNewsDiscussion({ ids: ['a', 'b'], agendas: true })).toEqual({ articles: [], generated_at: 'now' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/news/discussion?ids=a%2Cb&agendas=1');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer id-token');
    expect(init.cache).toBe('no-store');
    await fetchNewsDiscussion();
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toBe('/api/news/discussion');
  });

  it('puts the desired vote state as JSON and returns the fresh total', async () => {
    auth.token = 'id-token';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ news_id: 'a', count: 3, voted_by_me: true }), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await saveNewsDiscussionVote('a', true)).toEqual({ news_id: 'a', count: 3, voted_by_me: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/news/discussion');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ newsId: 'a', voted: true });
  });

  it('surfaces server errors with their status and message, and network failures without a status', async () => {
    auth.token = 'id-token';
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'This story is no longer in the feed.' }), { status: 404 })) as unknown as typeof fetch;
    await expect(saveNewsDiscussionVote('gone', true)).rejects.toMatchObject({ status: 404, message: 'This story is no longer in the feed.' });
    global.fetch = vi.fn(async () => new Response('oops', { status: 500 })) as unknown as typeof fetch;
    await expect(fetchNewsDiscussion()).rejects.toMatchObject({ status: 500, message: 'Request failed (HTTP 500).' });
    global.fetch = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const failure = await fetchNewsDiscussion().catch(e => e);
    expect(failure).toBeInstanceOf(NewsDiscussionRequestError);
    expect(failure.status).toBeNull();
    expect(failure.message).toContain('offline');
  });
});
