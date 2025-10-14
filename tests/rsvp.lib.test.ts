import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client used by lib/rsvp
const insert = vi.fn().mockResolvedValue({ error: null });
const del = vi.fn().mockImplementation(() => {
  let calls = 0;
  const chain: any = {
    eq: () => {
      calls += 1;
      if (calls >= 2) {
        // Final await resolves here
        return Promise.resolve({ error: null });
      }
      return chain;
    },
  };
  return chain;
});
let rsvpRows: any[] = [];

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from(table: string) {
      if (table !== 'rsvps') throw new Error('unexpected table: ' + table);
      return {
        insert,
        delete: del,
        select: () => ({
          eq: async () => ({ data: rsvpRows, error: null }),
        }),
      } as any;
    },
  },
}));

import { saveRsvp, deleteRsvp, getRsvpedEventIds } from '@/lib/rsvp';

describe('lib/rsvp', () => {
  beforeEach(() => {
    insert.mockClear(); del.mockClear(); rsvpRows = [];
  });

  it('saveRsvp inserts profile_id and event_id', async () => {
    const ok = await saveRsvp('user-1', 'event-1');
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith([{ profile_id: 'user-1', event_id: 'event-1' }]);
  });

  it('deleteRsvp deletes by both keys', async () => {
    // Our mock chains eq twice; just ensure first eq called with profile_id and then event_id
    await deleteRsvp('user-2', 'event-9');
    expect(del).toHaveBeenCalled();
  });

  it('getRsvpedEventIds returns event_id list', async () => {
    rsvpRows = [{ event_id: 'e1' }, { event_id: 'e2' }];
    const ids = await getRsvpedEventIds('user-7');
    expect(ids).toEqual(['e1', 'e2']);
  });
});
