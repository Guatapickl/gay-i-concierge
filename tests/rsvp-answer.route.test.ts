import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const fake = vi.hoisted(() => {
  const state = {
    user: null as { uid: string; email: string | null } | null,
    events: new Map<string, Record<string, unknown>>(),
    rsvps: new Map<string, Record<string, unknown>>(),
    profiles: new Map<string, Record<string, unknown>>(),
  };
  const snap = (id: string, data: Record<string, unknown> | undefined) => ({ id, exists: !!data, data: () => data });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          if (name === 'events') return snap(id, state.events.get(id));
          if (name === 'rsvps') return snap(id, state.rsvps.get(id));
          throw new Error(`unexpected doc get on ${name}`);
        },
        set: async (data: Record<string, unknown>) => { state.rsvps.set(id, { ...data }); },
        update: async (patch: Record<string, unknown>) => { state.rsvps.set(id, { ...state.rsvps.get(id), ...patch }); },
        delete: async () => { state.rsvps.delete(id); },
      }),
      where: (field: string, _op: string, value: unknown) => ({
        orderBy: () => ({
          get: async () => ({
            docs: [...state.rsvps.entries()].filter(([, r]) => r.event_id === value).map(([id, r]) => ({ id, exists: true, data: () => r })),
          }),
        }),
        get: async () => ({
          docs: field === '__name__'
            ? (value as string[]).filter(id => state.profiles.has(id)).map(id => ({ id, data: () => state.profiles.get(id) }))
            : [],
        }),
      }),
    }),
  };
  return {
    state,
    userFromRequest: vi.fn(async () => state.user),
    adminDb: vi.fn(() => db),
    enqueueRsvpConfirmation: vi.fn(async () => true),
    scheduleEventReminders: vi.fn(async () => ({ scheduled: 0, skipped: 0 })),
  };
});

vi.mock('@/lib/firebase/admin', () => ({ userFromRequest: fake.userFromRequest, adminDb: fake.adminDb }));
vi.mock('@/lib/reminders', () => ({
  enqueueRsvpConfirmation: fake.enqueueRsvpConfirmation,
  scheduleEventReminders: fake.scheduleEventReminders,
}));

import { GET, POST } from '@/app/api/events/rsvp/route';

const MEMBER = 'u-member';
const post = (body: unknown) =>
  POST(new NextRequest('https://example.test/api/events/rsvp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
const get = (query: string) => GET(new NextRequest(`https://example.test/api/events/rsvp${query}`));

describe('POST /api/events/rsvp (answers)', () => {
  beforeEach(() => {
    fake.state.user = { uid: MEMBER, email: 'member@example.com' };
    fake.state.events = new Map([['ev-1', { title: 'Meeting', event_datetime: '2099-09-13T22:30:00.000Z' }]]);
    fake.state.rsvps = new Map();
    fake.state.profiles = new Map();
    fake.enqueueRsvpConfirmation.mockClear();
    fake.scheduleEventReminders.mockClear();
  });

  it('defaults to yes, stores the answer and sends the confirmation', async () => {
    const res = await post({ event_id: 'ev-1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, status: 'yes', previous_status: null });
    expect(fake.state.rsvps.get('ev-1_u-member')).toMatchObject({ profile_id: MEMBER, event_id: 'ev-1', status: 'yes' });
    expect(fake.enqueueRsvpConfirmation).toHaveBeenCalledWith({ eventId: 'ev-1', userId: MEMBER, status: 'yes' });
    expect(fake.scheduleEventReminders).toHaveBeenCalledWith('ev-1');
  });

  it('rejects an unknown answer', async () => {
    const res = await post({ event_id: 'ev-1', status: 'perhaps' });
    expect(res.status).toBe(400);
    expect(fake.state.rsvps.size).toBe(0);
  });

  it('records "no" without a confirmation email or reminders', async () => {
    const res = await post({ event_id: 'ev-1', status: 'no' });
    expect(res.status).toBe(200);
    expect(fake.state.rsvps.get('ev-1_u-member')).toMatchObject({ status: 'no' });
    expect(fake.enqueueRsvpConfirmation).not.toHaveBeenCalled();
    expect(fake.scheduleEventReminders).not.toHaveBeenCalled();
  });

  it('replaces an earlier answer and keeps the original created_at', async () => {
    await post({ event_id: 'ev-1', status: 'no' });
    const created = fake.state.rsvps.get('ev-1_u-member')?.created_at;
    fake.enqueueRsvpConfirmation.mockClear();

    const res = await post({ event_id: 'ev-1', status: 'maybe' });
    expect(await res.json()).toMatchObject({ status: 'maybe', previous_status: 'no' });
    const row = fake.state.rsvps.get('ev-1_u-member')!;
    expect(row.status).toBe('maybe');
    expect(row.created_at).toBe(created);
    expect(fake.enqueueRsvpConfirmation).toHaveBeenCalledWith({ eventId: 'ev-1', userId: MEMBER, status: 'maybe' });

    // Same answer again: nothing changes and no second confirmation.
    fake.enqueueRsvpConfirmation.mockClear();
    await post({ event_id: 'ev-1', status: 'maybe' });
    expect(fake.enqueueRsvpConfirmation).not.toHaveBeenCalled();
  });

  it('treats a legacy row without status as yes', async () => {
    fake.state.rsvps.set('ev-1_u-member', { profile_id: MEMBER, event_id: 'ev-1', created_at: '2099-01-01T00:00:00.000Z' });
    const check = await (await get('?event_id=ev-1&check=true')).json();
    expect(check).toEqual({ rsvped: true, status: 'yes' });

    const res = await post({ event_id: 'ev-1', status: 'yes' });
    expect(await res.json()).toMatchObject({ status: 'yes', previous_status: 'yes' });
    expect(fake.enqueueRsvpConfirmation).not.toHaveBeenCalled();
  });

  it('reports the member\'s answer and per-answer counts', async () => {
    fake.state.rsvps.set('ev-1_u-member', { profile_id: MEMBER, event_id: 'ev-1', status: 'maybe', created_at: '2099-01-01T00:00:00.000Z' });
    fake.state.rsvps.set('ev-1_u-other', { profile_id: 'u-other', event_id: 'ev-1', status: 'no', created_at: '2099-01-02T00:00:00.000Z' });
    fake.state.rsvps.set('ev-1_u-third', { profile_id: 'u-third', event_id: 'ev-1', created_at: '2099-01-03T00:00:00.000Z' });

    expect(await (await get('?event_id=ev-1&check=true')).json()).toEqual({ rsvped: true, status: 'maybe' });
    fake.state.user = { uid: 'u-nobody', email: null };
    expect(await (await get('?event_id=ev-1&check=true')).json()).toEqual({ rsvped: false, status: null });

    const list = await (await get('?event_id=ev-1')).json();
    expect(list.count).toBe(1);
    expect(list.counts).toEqual({ yes: 1, maybe: 1, no: 1 });
    expect(list.attendees.map((a: { profile_id: string; status: string }) => [a.profile_id, a.status])).toEqual([
      [MEMBER, 'maybe'], ['u-other', 'no'], ['u-third', 'yes'],
    ]);
  });
});
