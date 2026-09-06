import { it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { userFromRequest, adminDb } = vi.hoisted(() => ({ userFromRequest: vi.fn().mockResolvedValue(null), adminDb: vi.fn(() => ({ collection: () => ({ where: () => ({ orderBy: () => ({ get: async () => ({ docs: [] }) }) }) }) })) }));
vi.mock('@/lib/firebase/admin', () => ({ userFromRequest, adminDb }));
vi.mock('@/lib/reminders', () => ({ enqueueRsvpConfirmation: vi.fn(), scheduleEventReminders: vi.fn() }));
import { GET } from '@/app/api/events/rsvp/route';
it('denies unauthenticated attendee lookups before accessing the database', async () => {
  const response = await GET(new NextRequest('https://example.test/api/events/rsvp?event_id=test'));
  expect(response.status).toBe(401);
  expect(adminDb).not.toHaveBeenCalled();
});
