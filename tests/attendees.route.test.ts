import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// In-memory stand-in for the Admin SDK surface the route uses:
// events (upcoming query + doc get), rsvps (per-event query), user_profiles
// (getAll) and Auth getUsers.
const fake = vi.hoisted(() => {
  type Doc = { id: string; data: Record<string, unknown> };
  const state = {
    user: null as { uid: string; email: string | null } | null,
    admins: new Set<string>(),
    upcoming: [] as Doc[],
    otherEvents: [] as Doc[],
    rsvps: [] as Doc[],
    profiles: new Map<string, Record<string, unknown>>(),
    authUsers: new Map<string, { displayName?: string; email?: string }>(),
    failRsvps: false,
  };
  const snap = (d: Doc) => ({ id: d.id, exists: true, data: () => d.data });
  const missing = (id: string) => ({ id, exists: false, data: () => undefined });
  const byField = (field: string) => (a: Doc, b: Doc) => String(a.data[field]).localeCompare(String(b.data[field]));
  const db = {
    collection: (name: string) => ({
      where: (_field: string, _op: string, value: unknown) => {
        if (name === 'events') {
          return { orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [...state.upcoming].sort(byField('event_datetime')).map(snap) }) }) }) };
        }
        if (name === 'rsvps') {
          return { orderBy: () => ({ get: async () => {
            if (state.failRsvps) throw new Error('rsvps query failed');
            return { docs: state.rsvps.filter(r => r.data.event_id === value).sort(byField('created_at')).map(snap) };
          } }) };
        }
        throw new Error(`unexpected query on ${name}`);
      },
      doc: (id: string) => ({
        collection: name,
        id,
        get: async () => {
          if (name !== 'events') throw new Error(`unexpected doc get on ${name}`);
          const found = [...state.upcoming, ...state.otherEvents].find(e => e.id === id);
          return found ? snap(found) : missing(id);
        },
      }),
    }),
    getAll: async (...refs: { collection: string; id: string }[]) => refs.map(ref => {
      if (ref.collection !== 'user_profiles') throw new Error(`unexpected getAll on ${ref.collection}`);
      const data = state.profiles.get(ref.id);
      return data ? { id: ref.id, exists: true, data: () => data } : missing(ref.id);
    }),
  };
  const getUsers = vi.fn(async (ids: { uid: string }[]) => ({
    users: ids.filter(i => state.authUsers.has(i.uid)).map(i => ({ uid: i.uid, ...state.authUsers.get(i.uid) })),
    notFound: ids.filter(i => !state.authUsers.has(i.uid)),
  }));
  return {
    state,
    getUsers,
    userFromRequest: vi.fn(async () => state.user),
    isAdminUid: vi.fn(async (uid: string) => state.admins.has(uid)),
    adminDb: vi.fn(() => db),
    adminAuth: vi.fn(() => ({ getUsers })),
  };
});

vi.mock('@/lib/firebase/admin', () => ({
  userFromRequest: fake.userFromRequest,
  isAdminUid: fake.isAdminUid,
  adminDb: fake.adminDb,
  adminAuth: fake.adminAuth,
}));

import { GET } from '@/app/api/events/attendees/route';

const request = (query = '') => new NextRequest(`https://example.test/api/events/attendees${query}`);
const ORGANIZER = 'organizer-uid';
const MEMBER = 'member-uid';
const nextMeeting = { id: 'poll-next', data: { title: 'Gay I Club Meeting', event_datetime: '2099-09-13T22:30:00.000Z', location: 'Somewhere private', created_at: '2099-09-01T00:00:00.000Z' } };
const laterMeeting = { id: 'later', data: { title: 'October meetup', event_datetime: '2099-10-11T22:30:00.000Z', location: null, created_at: '2099-09-01T00:00:00.000Z' } };

describe('GET /api/events/attendees (organizer RSVP view)', () => {
  beforeEach(() => {
    const s = fake.state;
    s.user = null; s.admins = new Set([ORGANIZER]); s.upcoming = []; s.otherEvents = []; s.rsvps = [];
    s.profiles = new Map(); s.authUsers = new Map(); s.failRsvps = false;
    fake.adminDb.mockClear(); fake.isAdminUid.mockClear(); fake.getUsers.mockClear();
  });

  it('rejects anonymous callers before touching the database', async () => {
    const res = await GET(request('?event_id=poll-next'));
    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(fake.adminDb).not.toHaveBeenCalled();
    expect(fake.isAdminUid).not.toHaveBeenCalled();
  });

  it('rejects signed-in members who are not organizers, without reading RSVPs', async () => {
    fake.state.user = { uid: MEMBER, email: 'member@example.com' };
    fake.state.upcoming = [nextMeeting];
    fake.state.rsvps = [{ id: 'poll-next_x', data: { event_id: 'poll-next', profile_id: 'x', created_at: '2099-09-02T00:00:00.000Z' } }];
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(fake.isAdminUid).toHaveBeenCalledWith(MEMBER);
    expect(fake.adminDb).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.attendees).toBeUndefined();
  });

  it('shows the organizer the earliest upcoming meeting with named attendees in RSVP order', async () => {
    const s = fake.state;
    s.user = { uid: ORGANIZER, email: 'organizer@example.com' };
    s.upcoming = [laterMeeting, nextMeeting];
    s.rsvps = [
      { id: 'poll-next_second', data: { event_id: 'poll-next', profile_id: 'second', created_at: '2099-09-02T10:00:00.000Z' } },
      { id: 'poll-next_first', data: { event_id: 'poll-next', profile_id: 'first', created_at: '2099-09-02T09:00:00.000Z' } },
      { id: 'poll-next_third', data: { event_id: 'poll-next', profile_id: 'third', created_at: '2099-09-02T11:00:00.000Z' } },
      { id: 'poll-next_fourth', data: { event_id: 'poll-next', profile_id: 'fourth', created_at: '2099-09-02T12:00:00.000Z' } },
      { id: 'later_first', data: { event_id: 'later', profile_id: 'first', created_at: '2099-09-02T13:00:00.000Z' } },
    ];
    s.profiles.set('first', { full_name: 'Robert Washko', email: 'robert@example.com' });
    s.profiles.set('third', { full_name: '   ', email: 'third-profile@example.com' });
    s.authUsers.set('second', { displayName: 'Display Name Only', email: 'second@example.com' });
    s.authUsers.set('third', { email: 'third-auth@example.com' });

    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    const body = await res.json();
    expect(body.event).toEqual({ id: 'poll-next', title: 'Gay I Club Meeting', event_datetime: '2099-09-13T22:30:00.000Z', location: 'Somewhere private' });
    expect(body.is_next_meeting).toBe(true);
    expect(body.upcoming_events.map((e: { id: string }) => e.id)).toEqual(['poll-next', 'later']);
    expect(body.count).toBe(4);
    expect(body.attendees).toEqual([
      { id: 'poll-next_first', profile_id: 'first', name: 'Robert Washko', email: null, rsvped_at: '2099-09-02T09:00:00.000Z' },
      { id: 'poll-next_second', profile_id: 'second', name: 'Display Name Only', email: null, rsvped_at: '2099-09-02T10:00:00.000Z' },
      { id: 'poll-next_third', profile_id: 'third', name: null, email: 'third-profile@example.com', rsvped_at: '2099-09-02T11:00:00.000Z' },
      { id: 'poll-next_fourth', profile_id: 'fourth', name: null, email: null, rsvped_at: '2099-09-02T12:00:00.000Z' },
    ]);
    // Auth is only consulted for members without a profile name.
    expect(fake.getUsers).toHaveBeenCalledTimes(1);
    expect(fake.getUsers.mock.calls[0][0]).toEqual([{ uid: 'second' }, { uid: 'third' }, { uid: 'fourth' }]);
    expect(JSON.stringify(body)).not.toContain('robert@example.com');
  });

  it('distinguishes "no upcoming meeting" from "meeting with zero RSVPs"', async () => {
    fake.state.user = { uid: ORGANIZER, email: null };

    const none = await (await GET(request())).json();
    expect(none).toMatchObject({ event: null, is_next_meeting: false, upcoming_events: [], count: 0, attendees: [] });

    fake.state.upcoming = [nextMeeting];
    const empty = await (await GET(request())).json();
    expect(empty.event?.id).toBe('poll-next');
    expect(empty.is_next_meeting).toBe(true);
    expect(empty).toMatchObject({ count: 0, attendees: [] });
    expect(fake.getUsers).not.toHaveBeenCalled();
  });

  it('lets the organizer pick another event and flags that it is not the next meeting', async () => {
    const s = fake.state;
    s.user = { uid: ORGANIZER, email: null };
    s.upcoming = [nextMeeting, laterMeeting];
    s.otherEvents = [{ id: 'past', data: { title: 'August meetup', event_datetime: '2000-08-01T22:30:00.000Z', location: null } }];
    s.rsvps = [{ id: 'later_a', data: { event_id: 'later', profile_id: 'a', created_at: '2099-09-02T00:00:00.000Z' } }];

    const later = await (await GET(request('?event_id=later'))).json();
    expect(later.event.id).toBe('later');
    expect(later.is_next_meeting).toBe(false);
    expect(later.count).toBe(1);

    const past = await (await GET(request('?event_id=past'))).json();
    expect(past.event.id).toBe('past');
    expect(past.is_next_meeting).toBe(false);
    expect(past.upcoming_events.map((e: { id: string }) => e.id)).toEqual(['poll-next', 'later']);

    const unknown = await GET(request('?event_id=nope'));
    expect(unknown.status).toBe(404);
  });

  it('reports a lookup failure as an error instead of an empty list', async () => {
    fake.state.user = { uid: ORGANIZER, email: null };
    fake.state.upcoming = [nextMeeting];
    fake.state.failRsvps = true;
    const res = await GET(request());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('rsvps query failed');
    expect(body.attendees).toBeUndefined();
    expect(body.count).toBeUndefined();
  });
});
