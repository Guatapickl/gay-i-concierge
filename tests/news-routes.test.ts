import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ caller: vi.fn(), admin: vi.fn(), ingest: vi.fn(), remove: vi.fn(), collect: vi.fn() }));
vi.mock('@/app/api/_lib/caller', () => ({ callerFromRequest: mocks.caller }));
vi.mock('@/lib/firebase/admin', () => ({ isAdminUid: mocks.admin, adminDb: vi.fn() }));
vi.mock('@/lib/news-store', () => ({ ingestNews: mocks.ingest, removeNews: mocks.remove }));
vi.mock('@/lib/news-ingestion', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/news-ingestion')>(), collectNews: mocks.collect }));
import { POST as cron } from '@/app/api/cron/news/route';
import { POST as refresh } from '@/app/api/news/refresh/route';
import { DELETE as remove } from '@/app/api/news/[id]/route';
import { POST as ingest } from '@/app/api/news/ingest/route';
import { POST as create } from '@/app/api/news/route';
const request = (path: string, secret?: string) => new Request(`https://club.test${path}`, { method: 'POST', headers: secret ? { authorization: `Bearer ${secret}` } : {} });
beforeEach(() => {
  vi.resetAllMocks(); process.env.CRON_SECRET = 'cron-key'; process.env.NEWS_INGEST_SECRET = 'ingest-key';
  mocks.caller.mockResolvedValue(null); mocks.admin.mockResolvedValue(false);
  mocks.ingest.mockResolvedValue({ inserted: 1, updated: 0, skipped: 0 });
  mocks.collect.mockResolvedValue({ items: [{}], sources: [{ name: 'OpenAI', ok: true, count: 1 }] });
});
describe('news route authorization', () => {
  it('rejects missing and incorrect cron secrets before fetching sources', async () => {
    expect((await cron(request('/api/cron/news'))).status).toBe(401);
    expect((await cron(request('/api/cron/news', 'wrong'))).status).toBe(401);
    expect(mocks.collect).not.toHaveBeenCalled();
  });
  it('accepts the scheduled secret and ingests sources', async () => {
    expect((await cron(request('/api/cron/news', 'cron-key'))).status).toBe(200);
    expect(mocks.ingest).toHaveBeenCalledWith([{}]);
  });
  it('returns retryable failure when every source is down', async () => {
    mocks.collect.mockResolvedValue({ items: [], sources: [{ name: 'OpenAI', ok: false, count: 0 }] });
    expect((await cron(request('/api/cron/news', 'cron-key'))).status).toBe(502);
    expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('rejects anonymous and non-admin removal, refresh and manual publishing', async () => {
    const context = { params: Promise.resolve({ id: 'story' }) };
    expect((await remove(request('/api/news/story'), context)).status).toBe(401);
    expect((await refresh(request('/api/news/refresh'))).status).toBe(401);
    expect((await create(request('/api/news'))).status).toBe(401);
    mocks.caller.mockResolvedValue({ uid: 'member' });
    expect((await remove(request('/api/news/story'), context)).status).toBe(403);
    expect((await refresh(request('/api/news/refresh'))).status).toBe(403);
    expect((await create(request('/api/news'))).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.collect).not.toHaveBeenCalled();
  });
  it('allows an owner to remove a story', async () => {
    mocks.caller.mockResolvedValue({ uid: 'owner' }); mocks.admin.mockResolvedValue(true); mocks.remove.mockResolvedValue(true);
    expect((await remove(request('/api/news/story'), { params: Promise.resolve({ id: 'story' }) })).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith('story', 'owner');
  });
  it('preserves external publisher secret auth and rejects oversized batches', async () => {
    expect((await ingest(request('/api/news/ingest', 'wrong'))).status).toBe(401);
    const req = new Request('https://club.test/api/news/ingest', { method: 'POST', headers: { authorization: 'Bearer ingest-key' }, body: JSON.stringify({ items: Array(201).fill({}) }) });
    expect((await ingest(req)).status).toBe(400);
  });
});
