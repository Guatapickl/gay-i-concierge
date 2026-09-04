import { beforeEach, describe, expect, it, vi } from 'vitest';

let rows: any[] = [];
const { addDoc, updateDoc, deleteDoc, getDocs, orderBy, limit } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: [field, dir] })),
  limit: vi.fn((n: number) => ({ limit: n })),
}));

vi.mock('@/lib/firebase/client', () => ({ db: {} }));
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (_db: unknown, name: string, id: string) => ({ name, id }),
    query: (c: any, ...constraints: any[]) => ({ ...c, constraints }),
    orderBy,
    limit,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
  };
});

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from '@/lib/announcements';

const snapOf = (r: any) => ({ id: r.id, data: () => { const { id, ...rest } = r; return rest; } });

describe('lib/announcements', () => {
  beforeEach(() => {
    rows = [];
    addDoc.mockReset();
    updateDoc.mockReset();
    deleteDoc.mockReset();
    getDocs.mockReset();
    orderBy.mockClear();
    limit.mockClear();
    getDocs.mockImplementation(async () => ({ docs: rows.map(snapOf) }));
  });

  it('loads announcements newest first', async () => {
    rows = [
      { id: 'a2', title: 'Latest', body: 'Now', author_user_id: 'admin-1', created_at: '2030-01-02T00:00:00Z', updated_at: '2030-01-02T00:00:00Z' },
    ];

    const announcements = await getAnnouncements();

    expect(announcements).toEqual(rows);
    expect(getDocs).toHaveBeenCalledWith(expect.objectContaining({ name: 'announcements' }));
    expect(orderBy).toHaveBeenCalledWith('created_at', 'desc');
    expect(limit).toHaveBeenCalledWith(100);
  });

  it('creates a trimmed announcement authored by the current admin', async () => {
    addDoc.mockResolvedValue({ id: 'a1' });

    const announcement = await createAnnouncement({
      authorUserId: 'admin-1',
      title: '  Club update  ',
      body: '  Doors open at 6  ',
    });

    expect(addDoc).toHaveBeenCalledWith(
      { name: 'announcements' },
      expect.objectContaining({ author_user_id: 'admin-1', title: 'Club update', body: 'Doors open at 6' }),
    );
    expect(announcement?.id).toBe('a1');
    expect(announcement?.title).toBe('Club update');
  });

  it('updates title and body for an existing announcement', async () => {
    updateDoc.mockResolvedValue(undefined);

    const ok = await updateAnnouncement('a1', {
      title: '  Revised title  ',
      body: '  Revised body  ',
    });

    expect(ok).toBe(true);
    expect(updateDoc).toHaveBeenCalledWith(
      { name: 'announcements', id: 'a1' },
      expect.objectContaining({ title: 'Revised title', body: 'Revised body' }),
    );
  });

  it('deletes an existing announcement by id', async () => {
    deleteDoc.mockResolvedValue(undefined);

    const ok = await deleteAnnouncement('a1');

    expect(ok).toBe(true);
    expect(deleteDoc).toHaveBeenCalledWith({ name: 'announcements', id: 'a1' });
  });

  it('returns false when the write fails', async () => {
    deleteDoc.mockRejectedValue(new Error('permission-denied'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await deleteAnnouncement('a1')).toBe(false);
    spy.mockRestore();
  });
});
