import { beforeEach, describe, expect, it, vi } from 'vitest';

let rows: any[] = [];
const insert = vi.fn();
const update = vi.fn();
const del = vi.fn();
const order = vi.fn();
const limit = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from(table: string) {
      if (table !== 'announcements') throw new Error('unexpected table: ' + table);
      return {
        select: () => ({
          order,
        }),
        insert,
        update,
        delete: del,
      } as any;
    },
  },
}));

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from '@/lib/announcements';

describe('lib/announcements', () => {
  beforeEach(() => {
    rows = [];
    insert.mockReset();
    update.mockReset();
    del.mockReset();
    order.mockReset();
    limit.mockReset();
    order.mockReturnValue({ limit });
    limit.mockImplementation(() => Promise.resolve({ data: rows, error: null }));
  });

  it('loads announcements newest first', async () => {
    rows = [
      { id: 'a2', title: 'Latest', body: 'Now', author_user_id: 'admin-1', created_at: '2030-01-02T00:00:00Z', updated_at: '2030-01-02T00:00:00Z' },
    ];

    const announcements = await getAnnouncements();

    expect(announcements).toEqual(rows);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(100);
  });

  it('creates a trimmed announcement authored by the current admin', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'a1', title: 'Club update', body: 'Doors open at 6', author_user_id: 'admin-1', created_at: '', updated_at: '' },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    insert.mockReturnValue({ select });

    const announcement = await createAnnouncement({
      authorUserId: 'admin-1',
      title: '  Club update  ',
      body: '  Doors open at 6  ',
    });

    expect(insert).toHaveBeenCalledWith({
      author_user_id: 'admin-1',
      title: 'Club update',
      body: 'Doors open at 6',
    });
    expect(announcement?.id).toBe('a1');
  });

  it('updates title and body for an existing announcement', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    update.mockReturnValue({ eq });

    const ok = await updateAnnouncement('a1', {
      title: '  Revised title  ',
      body: '  Revised body  ',
    });

    expect(ok).toBe(true);
    expect(update).toHaveBeenCalledWith({
      title: 'Revised title',
      body: 'Revised body',
    });
    expect(eq).toHaveBeenCalledWith('id', 'a1');
  });

  it('deletes an existing announcement by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    del.mockReturnValue({ eq });

    const ok = await deleteAnnouncement('a1');

    expect(ok).toBe(true);
    expect(eq).toHaveBeenCalledWith('id', 'a1');
  });
});
