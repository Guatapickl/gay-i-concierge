import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firestore SDK + auth helper used by lib/rsvp
const { setDoc, deleteDoc, getDocs, auth } = vi.hoisted(() => ({
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn(),
  auth: { token: null as string | null },
}));
let rsvpRows: any[] = [];

vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
vi.mock('@/lib/firebase/authClient', () => ({
  authHeader: async () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
}));
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (_db: unknown, name: string, id: string) => ({ name, id }),
    query: (c: any, ...constraints: any[]) => ({ ...c, constraints }),
    where: (field: string, op: string, value: unknown) => ({ where: [field, op, value] }),
    getDocs,
    setDoc,
    deleteDoc,
  };
});

import { saveRsvp, deleteRsvp, getRsvpedEventIds, rsvpDocId } from '@/lib/rsvp';

describe('lib/rsvp', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    setDoc.mockClear(); deleteDoc.mockClear(); getDocs.mockReset();
    rsvpRows = []; auth.token = null;
    global.fetch = realFetch;
    getDocs.mockImplementation(async () => ({
      docs: rsvpRows.map(r => ({ id: rsvpDocId(r.event_id, r.profile_id ?? 'u'), data: () => r })),
    }));
  });

  it('saveRsvp writes a deterministic rsvps doc when not signed in', async () => {
    const ok = await saveRsvp('user-1', 'event-1');
    expect(ok).toBe(true);
    expect(setDoc).toHaveBeenCalledWith(
      { name: 'rsvps', id: 'event-1_user-1' },
      expect.objectContaining({ profile_id: 'user-1', event_id: 'event-1' }),
    );
  });

  it('saveRsvp posts to the RSVP API when the user has a session', async () => {
    auth.token = 'session-token';
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = fetchMock as any;

    const ok = await saveRsvp('user-1', 'event-1');

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/events/rsvp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer session-token',
      },
      body: JSON.stringify({ event_id: 'event-1' }),
    });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('deleteRsvp deletes the composite-key doc', async () => {
    await deleteRsvp('user-2', 'event-9');
    expect(deleteDoc).toHaveBeenCalledWith({ name: 'rsvps', id: 'event-9_user-2' });
  });

  it('getRsvpedEventIds returns event_id list', async () => {
    rsvpRows = [{ event_id: 'e1' }, { event_id: 'e2' }];
    const ids = await getRsvpedEventIds('user-7');
    expect(ids).toEqual(['e1', 'e2']);
    expect(getDocs).toHaveBeenCalledWith(expect.objectContaining({
      name: 'rsvps',
      constraints: [{ where: ['profile_id', '==', 'user-7'] }],
    }));
  });
});
