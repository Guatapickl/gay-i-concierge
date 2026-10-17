import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the Admin SDK surface the library uses: the vote
// collection (get / where-in / where-eq), news_items and events documents,
// getAll and runTransaction with create/update semantics (nothing deletes votes).
const fake = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    caller: null as { uid: string; email: string | null } | null,
    votes: new Map<string, Row>(),
    stories: new Map<string, Row>(),
    events: [] as { id: string; data: Row }[],
    failReads: false,
    failWrites: false,
    transactions: 0,
  };
  const snap = (id: string, data: Row | undefined) => ({ id, exists: data !== undefined, data: () => data });
  const voteDocs = (filter: (row: Row) => boolean) => ({
    get: async () => {
      if (state.failReads) throw new Error('votes query failed');
      return { docs: [...state.votes].filter(([, row]) => filter(row)).map(([id, row]) => snap(id, row)) };
    },
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ collection: name, id }),
      get: async () => {
        if (name !== 'news_discussion_votes') throw new Error(`unexpected get on ${name}`);
        return voteDocs(() => true).get();
      },
      where: (field: string, op: string, value: unknown) => {
        if (name !== 'news_discussion_votes' || field !== 'news_id') throw new Error(`unexpected query on ${name}.${field}`);
        if (op === 'in') return voteDocs(row => (value as string[]).includes(row.news_id as string));
        if (op === '==') return voteDocs(row => row.news_id === value);
        throw new Error(`unexpected operator ${op}`);
      },
      orderBy: (field: string, direction: string) => ({
        limit: (n: number) => ({
          get: async () => {
            if (name !== 'events' || field !== 'event_datetime' || direction !== 'desc') throw new Error(`unexpected query on ${name}`);
            if (state.failReads) throw new Error('events query failed');
            const sorted = [...state.events].sort((a, b) => String(b.data.event_datetime).localeCompare(String(a.data.event_datetime)));
            return { docs: sorted.slice(0, n).map(e => snap(e.id, e.data)) };
          },
        }),
      }),
    }),
    getAll: async (...refs: { collection: string; id: string }[]) => refs.map(ref => {
      if (ref.collection !== 'news_items') throw new Error(`unexpected getAll on ${ref.collection}`);
      return snap(ref.id, state.stories.get(ref.id));
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      state.transactions++;
      const pending: (() => void)[] = [];
      const tx = {
        get: async (ref: { collection: string; id: string }) => {
          if (ref.collection === 'news_items') return snap(ref.id, state.stories.get(ref.id));
          if (ref.collection === 'news_discussion_votes') return snap(ref.id, state.votes.get(ref.id));
          throw new Error(`unexpected tx.get on ${ref.collection}`);
        },
        create: (ref: { id: string }, row: Row) => pending.push(() => {
          if (state.votes.has(ref.id)) throw new Error('ALREADY_EXISTS');
          state.votes.set(ref.id, row);
        }),
        update: (ref: { id: string }, patch: Row) => pending.push(() => {
          const current = state.votes.get(ref.id);
          if (!current) throw new Error('NOT_FOUND');
          state.votes.set(ref.id, { ...current, ...patch });
        }),
        delete: () => { throw new Error('vote documents must never be deleted'); },
      };
      const result = await fn(tx);
      if (state.failWrites) throw new Error('Temporary write failure');
      pending.forEach(write => write());
      return result;
    },
  };
  return { state, adminDb: vi.fn(() => db) };
});

vi.mock('@/lib/firebase/admin', () => ({ adminDb: fake.adminDb }));
vi.mock('@/app/api/_lib/caller', () => ({ callerFromRequest: async () => fake.state.caller }));

import {
  listNewsDiscussion,
  newsDiscussionVoteId,
  parseNewsIdList,
  saveNewsDiscussionVote,
  sortDiscussionArticles,
  tallyVotes,
  validateNewsDiscussionVote,
} from '@/lib/news-discussion';
import { GET, PUT } from '@/app/api/news/discussion/route';

const A = 'story-a';
const B = 'story-b';
const put = (body: unknown) => new Request('https://club.test/api/news/discussion', { method: 'PUT', body: typeof body === 'string' ? body : JSON.stringify(body) });
const get = (query = '') => new Request(`https://club.test/api/news/discussion${query}`);

beforeEach(() => {
  const s = fake.state;
  s.caller = { uid: 'member-a', email: null };
  s.votes = new Map();
  s.stories = new Map([
    [A, { title: 'Story A', source_url: 'https://example.com/a?utm_source=rss', source_name: 'Example', published_at: '2026-09-10T00:00:00.000Z' }],
    [B, { title: 'Story B', source_url: 'https://example.com/b', source_name: null, published_at: '2026-09-12T00:00:00.000Z' }],
  ]);
  s.events = [];
  s.failReads = false;
  s.failWrites = false;
  s.transactions = 0;
  fake.adminDb.mockClear();
});

describe('news discussion votes (library)', () => {
  it('counts one vote per member and story, survives retries, and lets the member withdraw without touching others', async () => {
    expect(await saveNewsDiscussionVote('member-a', { newsId: A, voted: true })).toEqual({ news_id: A, count: 1, voted_by_me: true });
    expect(await saveNewsDiscussionVote('member-a', { newsId: A, voted: true })).toEqual({ news_id: A, count: 1, voted_by_me: true });
    await Promise.all(Array.from({ length: 5 }, () => saveNewsDiscussionVote('member-a', { newsId: A, voted: true })));
    expect(fake.state.votes.size).toBe(1);
    await saveNewsDiscussionVote('member-b', { newsId: A, voted: true });
    expect(await saveNewsDiscussionVote('member-a', { newsId: A, voted: false })).toEqual({ news_id: A, count: 1, voted_by_me: false });
    expect(await saveNewsDiscussionVote('member-a', { newsId: A, voted: false })).toEqual({ news_id: A, count: 1, voted_by_me: false });
    expect(fake.state.votes.get(newsDiscussionVoteId(A, 'member-b'))).toMatchObject({ active: true, withdrawn_at: null, vote_count: 1, withdrawal_count: 0 });
    // The withdrawn vote stays on record, marked inactive, and is not counted.
    const withdrawn = fake.state.votes.get(newsDiscussionVoteId(A, 'member-a'));
    expect(withdrawn).toMatchObject({ news_id: A, user_id: 'member-a', active: false, vote_count: 1, withdrawal_count: 1 });
    expect(withdrawn?.withdrawn_at).toBeInstanceOf(Date);
    expect(fake.state.votes.size).toBe(2);
  });

  it('reactivates the same document when a member votes again after withdrawing, keeping the history', async () => {
    await saveNewsDiscussionVote('member-a', { newsId: A, voted: true });
    const id = newsDiscussionVoteId(A, 'member-a');
    const created = fake.state.votes.get(id)?.created_at;
    await saveNewsDiscussionVote('member-a', { newsId: A, voted: false });
    expect((await listNewsDiscussion('member-a')).articles).toEqual([]);
    expect(await saveNewsDiscussionVote('member-a', { newsId: A, voted: true })).toEqual({ news_id: A, count: 1, voted_by_me: true });
    expect(fake.state.votes.size).toBe(1);
    expect(fake.state.votes.get(id)).toMatchObject({ active: true, withdrawn_at: null, vote_count: 2, withdrawal_count: 1, created_at: created });
    expect(fake.state.votes.get(id)?.revoted_at).toBeInstanceOf(Date);
    // Re-voting while already active writes nothing, so the counters do not drift.
    await saveNewsDiscussionVote('member-a', { newsId: A, voted: true });
    expect(fake.state.votes.get(id)).toMatchObject({ vote_count: 2, withdrawal_count: 1 });
    expect((await listNewsDiscussion('member-a')).articles.map(a => [a.news_id, a.count, a.voted_by_me])).toEqual([[A, 1, true]]);
  });

  it('refuses a vote for a story that is no longer in the feed but still allows withdrawing one', async () => {
    await expect(saveNewsDiscussionVote('member-a', { newsId: 'gone', voted: true })).rejects.toMatchObject({ status: 404 });
    expect(fake.state.votes.size).toBe(0);
    fake.state.votes.set(newsDiscussionVoteId('gone', 'member-a'), { news_id: 'gone', user_id: 'member-a' });
    expect(await saveNewsDiscussionVote('member-a', { newsId: 'gone', voted: false })).toEqual({ news_id: 'gone', count: 0, voted_by_me: false });
    expect(fake.state.votes.get(newsDiscussionVoteId('gone', 'member-a'))).toMatchObject({ active: false, withdrawal_count: 1 });
    // Withdrawing a vote that was never cast writes nothing at all.
    expect(await saveNewsDiscussionVote('member-b', { newsId: 'gone', voted: false })).toEqual({ news_id: 'gone', count: 0, voted_by_me: false });
    expect(fake.state.votes.has(newsDiscussionVoteId('gone', 'member-b'))).toBe(false);
  });

  it.each([null, [], {}, { newsId: 'bad id!', voted: true }, { newsId: A, voted: 'true' }, { newsId: 42, voted: true }])('rejects invalid vote %j', input => {
    expect(() => validateNewsDiscussionVote(input)).toThrow();
  });

  it('parses the ids filter strictly', () => {
    expect(parseNewsIdList(null)).toBeNull();
    expect(parseNewsIdList('')).toBeNull();
    expect(parseNewsIdList(` ${A}, ${B},${A} `)).toEqual([A, B]);
    expect(() => parseNewsIdList('a,b c')).toThrow();
    expect(() => parseNewsIdList(Array.from({ length: 101 }, (_, i) => `id${i}`).join(','))).toThrow();
  });

  it('lists voted stories with totals and the caller choice only, ignoring malformed records and removed stories', async () => {
    await saveNewsDiscussionVote('member-a', { newsId: A, voted: true });
    await saveNewsDiscussionVote('secret-member', { newsId: A, voted: true });
    await saveNewsDiscussionVote('secret-member', { newsId: B, voted: true });
    fake.state.votes.set('forged', { news_id: A, user_id: 'forger' });
    fake.state.votes.set(newsDiscussionVoteId('removed-story', 'member-a'), { news_id: 'removed-story', user_id: 'member-a' });
    const list = await listNewsDiscussion('member-a');
    expect(list.articles.map(a => [a.news_id, a.count, a.voted_by_me])).toEqual([[A, 2, true], [B, 1, false]]);
    expect(list.articles[0]).toMatchObject({ title: 'Story A', source_url: 'https://example.com/a?utm_source=rss', source_name: 'Example', on_agendas: [] });
    expect(JSON.stringify(list)).not.toContain('secret-member');
    expect(JSON.stringify(list)).not.toContain('member-a');
    expect(list.articles.some(a => a.news_id === 'removed-story')).toBe(false);
    expect(fake.state.votes.has(newsDiscussionVoteId('removed-story', 'member-a'))).toBe(true);
  });

  it('orders by votes, then newest story, then id, and honours the ids filter', async () => {
    fake.state.stories.set('story-c', { title: 'Story C', source_url: 'https://example.com/c', published_at: '2026-09-12T00:00:00.000Z' });
    fake.state.stories.set('story-d', { title: 'Story D', source_url: 'https://example.com/d', published_at: null });
    for (const [id, voters] of [[A, ['m1']], [B, ['m1']], ['story-c', ['m1']], ['story-d', ['m1', 'm2']]] as [string, string[]][]) {
      for (const voter of voters) await saveNewsDiscussionVote(voter, { newsId: id, voted: true });
    }
    const all = await listNewsDiscussion('m1');
    expect(all.articles.map(a => a.news_id)).toEqual(['story-d', B, 'story-c', A]);
    expect(sortDiscussionArticles([...all.articles].reverse()).map(a => a.news_id)).toEqual(['story-d', B, 'story-c', A]);
    const some = await listNewsDiscussion('m2', { ids: [A, 'story-d', 'never-voted'] });
    expect(some.articles.map(a => [a.news_id, a.voted_by_me])).toEqual([['story-d', true], [A, false]]);
  });

  it('reports where a story already sits on an agenda, by id or by link, split into upcoming and past meetings', async () => {
    await saveNewsDiscussionVote('m1', { newsId: A, voted: true });
    await saveNewsDiscussionVote('m1', { newsId: B, voted: true });
    fake.state.events = [
      { id: 'next', data: { title: 'Next meetup', event_datetime: '2099-01-01T00:00:00.000Z', agenda: [{ title: 'Welcome' }, { title: 'Story A', news_id: A, link: 'https://example.com/a' }] } },
      { id: 'past', data: { title: 'August meetup', event_datetime: '2000-08-01T00:00:00.000Z', agenda: [{ title: 'Renamed', link: 'https://example.com/a?utm_medium=mail' }] } },
      { id: 'none', data: { title: 'No agenda', event_datetime: '2099-02-01T00:00:00.000Z', agenda: null } },
    ];
    const without = await listNewsDiscussion('m1');
    expect(without.articles.every(a => a.on_agendas.length === 0)).toBe(true);
    const list = await listNewsDiscussion('m1', { includeAgendas: true });
    const a = list.articles.find(x => x.news_id === A)!;
    expect(a.on_agendas).toEqual([
      { event_id: 'next', title: 'Next meetup', event_datetime: '2099-01-01T00:00:00.000Z', is_upcoming: true },
      { event_id: 'past', title: 'August meetup', event_datetime: '2000-08-01T00:00:00.000Z', is_upcoming: false },
    ]);
    expect(list.articles.find(x => x.news_id === B)!.on_agendas).toEqual([]);
  });

  it('throws on read failures instead of reporting zero votes', async () => {
    await saveNewsDiscussionVote('m1', { newsId: A, voted: true });
    fake.state.failReads = true;
    await expect(listNewsDiscussion('m1')).rejects.toThrow('votes query failed');
  });

  it('keeps a stored vote when the withdrawal write fails', async () => {
    await saveNewsDiscussionVote('member-a', { newsId: A, voted: true });
    fake.state.failWrites = true;
    await expect(saveNewsDiscussionVote('member-a', { newsId: A, voted: false })).rejects.toThrow('Temporary write failure');
    fake.state.failWrites = false;
    expect((await listNewsDiscussion('member-a')).articles[0]).toMatchObject({ news_id: A, count: 1, voted_by_me: true });
  });

  it('tallies valid, active documents only', () => {
    const good = newsDiscussionVoteId(A, 'u1');
    const tally = tallyVotes([
      { id: good, data: () => ({ news_id: A, user_id: 'u1' }) },
      { id: 'wrong-id', data: () => ({ news_id: A, user_id: 'u2' }) },
      { id: newsDiscussionVoteId(A, 'u3'), data: () => ({ news_id: A }) },
      { id: newsDiscussionVoteId(A, 'u4'), data: () => ({ news_id: A, user_id: 'u4', active: false, withdrawn_at: new Date() }) },
      { id: newsDiscussionVoteId(A, 'u5'), data: () => ({ news_id: A, user_id: 'u5', active: true }) },
      { id: 'empty', data: () => undefined },
    ]);
    expect([...tally.get(A) ?? []]).toEqual(['u1', 'u5']);
  });
});

describe('/api/news/discussion', () => {
  it('requires sign-in for reading and voting, without touching the database', async () => {
    fake.state.caller = null;
    expect((await GET(get())).status).toBe(401);
    expect((await PUT(put({ newsId: A, voted: true }))).status).toBe(401);
    expect(fake.adminDb).not.toHaveBeenCalled();
    expect(fake.state.votes.size).toBe(0);
  });

  it('votes as the authenticated member, ignoring any supplied identity, and returns the fresh total', async () => {
    const res = await PUT(put({ newsId: A, voted: true, userId: 'someone-else', user_id: 'someone-else' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.json()).toEqual({ news_id: A, count: 1, voted_by_me: true });
    expect(fake.state.votes.has(newsDiscussionVoteId(A, 'member-a'))).toBe(true);
    expect(fake.state.votes.has(newsDiscussionVoteId(A, 'someone-else'))).toBe(false);
    const withdrawn = await PUT(put({ newsId: A, voted: false }));
    expect(await withdrawn.json()).toEqual({ news_id: A, count: 0, voted_by_me: false });
  });

  it('rejects invalid, oversized and unknown-story requests before or without writing', async () => {
    expect((await PUT(put('{}'))).status).toBe(400);
    expect((await PUT(put('not json'))).status).toBe(400);
    expect((await PUT(put('x'.repeat(2001)))).status).toBe(413);
    expect((await PUT(put({ newsId: 'missing', voted: true }))).status).toBe(404);
    expect(fake.state.votes.size).toBe(0);
  });

  it('lists totals for the caller, filters by ids, and validates the filter', async () => {
    await PUT(put({ newsId: A, voted: true }));
    fake.state.caller = { uid: 'member-b', email: null };
    await PUT(put({ newsId: B, voted: true }));
    const all = await (await GET(get())).json();
    expect(all.articles.map((a: { news_id: string; count: number; voted_by_me: boolean }) => [a.news_id, a.count, a.voted_by_me])).toEqual([[B, 1, true], [A, 1, false]]);
    const filtered = await (await GET(get(`?ids=${A}`))).json();
    expect(filtered.articles.map((a: { news_id: string }) => a.news_id)).toEqual([A]);
    expect((await GET(get('?ids=bad%20id'))).status).toBe(400);
    expect((await GET(get('?ids=' + Array.from({ length: 101 }, (_, i) => `i${i}`).join(',')))).status).toBe(400);
  });

  it('answers a read failure with 500 and no article list', async () => {
    fake.state.failReads = true;
    const res = await GET(get());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.articles).toBeUndefined();
    expect(body.error).toMatch(/could not be loaded/i);
  });
});
