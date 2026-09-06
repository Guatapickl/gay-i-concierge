import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
vi.mock('@/lib/firebase/db', () => ({ listRows: vi.fn(), nowIso: vi.fn(), payloadOf: vi.fn(), ref: vi.fn(), toIso: (v: unknown) => v }));
vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(), getDoc: vi.fn(), limit: vi.fn(), orderBy: vi.fn(), setDoc: vi.fn(),
  where: (field: string, operator: string, value: unknown) => ({ field, operator, value }),
}));
import { listRows } from '@/lib/firebase/db';
import { getNewsItemsByIds } from '@/lib/news';

describe('saved news loading', () => {
  beforeEach(() => vi.clearAllMocks());
  it('loads older saved IDs independently of feed limits in bounded deduplicated batches', async () => {
    vi.mocked(listRows).mockImplementation(async (_collection, ...constraints) => {
      const ids = (constraints[0] as unknown as { value: string[] }).value;
      return ids.filter(id => id !== 'deleted').map(id => ({ id, published_at: '2020-01-01', ingested_at: '2020-01-01' }));
    });
    const ids = [...Array.from({ length: 61 }, (_, i) => `old-${i}`), 'old-0', 'deleted'];
    const items = await getNewsItemsByIds(ids);
    expect(items).toHaveLength(61);
    expect(items.some(item => item.id === 'old-60')).toBe(true);
    expect(listRows).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(listRows).mock.calls) {
      expect(call[0]).toBe('news_items');
      const query = call[1] as unknown as { field: string; value: string[] };
      expect(query.field).toBe('__name__');
      expect(query.value.length).toBeLessThanOrEqual(30);
    }
  });
  it('skips empty requests and reports permission/read failures instead of pretending saved stories are empty', async () => {
    expect(await getNewsItemsByIds([])).toEqual([]);
    expect(listRows).not.toHaveBeenCalled();
    vi.mocked(listRows).mockRejectedValue(new Error('Permission denied'));
    await expect(getNewsItemsByIds(['old-story'])).rejects.toThrow('Permission denied');
  });
});
