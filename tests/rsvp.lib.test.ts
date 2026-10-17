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

import { saveRsvp, deleteRsvp, getRsvpedEventIds, getRsvpStatuses, rsvpDocId, getEventAttendees, getNextMeetingRsvps, RsvpViewError } from '@/lib/rsvp';

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
      expect.objectContaining({ profile_id: 'user-1', event_id: 'event-1', status: 'yes' }),
    );
    await saveRsvp('user-1', 'event-1', 'no');
    expect(setDoc).toHaveBeenLastCalledWith(
      { name: 'rsvps', id: 'event-1_user-1' },
      expect.objectContaining({ status: 'no' }),
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
      body: JSON.stringify({ event_id: 'event-1', status: 'yes' }),
    });
    expect(setDoc).not.toHaveBeenCalled();

    await saveRsvp('user-1', 'event-1', 'maybe');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/events/rsvp', expect.objectContaining({
      body: JSON.stringify({ event_id: 'event-1', status: 'maybe' }),
    }));
  });

  it('deleteRsvp deletes the composite-key doc', async () => {
    await deleteRsvp('user-2', 'event-9');
    expect(deleteDoc).toHaveBeenCalledWith({ name: 'rsvps', id: 'event-9_user-2' });
  });

  it('getRsvpedEventIds lists events the member is going to or might go to', async () => {
    rsvpRows = [{ event_id: 'e1' }, { event_id: 'e2', status: 'maybe' }, { event_id: 'e3', status: 'no' }];
    const ids = await getRsvpedEventIds('user-7');
    expect(ids).toEqual(['e1', 'e2']);
    await expect(getRsvpStatuses('user-7')).resolves.toEqual({ e1: 'yes', e2: 'maybe', e3: 'no' });
    expect(getDocs).toHaveBeenCalledWith(expect.objectContaining({
      name: 'rsvps',
      constraints: [{ where: ['profile_id', '==', 'user-7'] }],
    }));
  });
});

describe('lib/rsvp organizer view (getNextMeetingRsvps)', () => {
  const realFetch = global.fetch;
  beforeEach(() => { auth.token = null; global.fetch = realFetch; });

  it('throws a 401 without calling the API when nobody is signed in', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(getNextMeetingRsvps()).rejects.toMatchObject({ name: 'RsvpViewError', status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the organizer endpoint with the bearer token and no caching', async () => {
    auth.token = 'organizer-token';
    const payload = { event: null, is_next_meeting: false, upcoming_events: [], count: 0, counts: { yes: 0, maybe: 0, no: 0 }, attendees: [], generated_at: 'now' };
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(getNextMeetingRsvps()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/api/events/attendees', { headers: { Authorization: 'Bearer organizer-token' }, cache: 'no-store' });
    await getNextMeetingRsvps('poll-abc/1');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/events/attendees?event_id=poll-abc%2F1', expect.anything());
  });

  it('surfaces 403 and 500 responses as errors instead of an empty list', async () => {
    auth.token = 'member-token';
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'forbidden: organizers only' }), { status: 403 })) as unknown as typeof fetch;
    const forbidden = await getNextMeetingRsvps().catch(e => e);
    expect(forbidden).toBeInstanceOf(RsvpViewError);
    expect(forbidden.status).toBe(403);
    expect(forbidden.message).toBe('forbidden: organizers only');

    global.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 })) as unknown as typeof fetch;
    await expect(getNextMeetingRsvps()).rejects.toMatchObject({ status: 500, message: 'Request failed (HTTP 500).' });
  });

  it('throws on network failure where getEventAttendees would report zero attendees', async () => {
    auth.token = 'member-token';
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    await expect(getNextMeetingRsvps()).rejects.toMatchObject({ status: null, message: 'Could not reach the server (Failed to fetch).' });
    const legacy = await getEventAttendees('event-1');
    expect(legacy).toEqual({ event_id: 'event-1', count: 0, counts: { yes: 0, maybe: 0, no: 0 }, attendees: [] });
  });
});
