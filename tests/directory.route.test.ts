import { it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
const { userFromRequest, get } = vi.hoisted(() => ({ userFromRequest: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ userFromRequest, adminDb: () => ({ collection: () => ({ get, orderBy: () => ({ get }), doc: () => ({ get }) }) }) }));
beforeEach(() => { vi.clearAllMocks(); });
it('has a server directory boundary', () => { expect(existsSync('app/api/directory/route.ts')).toBe(true); });
it('rejects unauthenticated access before reading private documents', async () => {
  const { GET } = await import('@/app/api/directory/route');
  userFromRequest.mockResolvedValue(null);
  expect((await GET(new Request('https://example.test/api/directory'))).status).toBe(401);
  expect(get).not.toHaveBeenCalled();
});
it('allowlists list and detail fields, including hostile extra fields', async () => {
  const { GET } = await import('@/app/api/directory/route');
  userFromRequest.mockResolvedValue({ uid: 'member' });
  const doc = { id: 'other', exists: true, data: () => ({ id: 'spoof', full_name: 'Member', experience_level: 'Beginner', interests: ['AI'], created_at: '2026-01-01', email: 'private@test.com', phone: '+123456789', consent_ip: '1.2.3.4', extra: { secret: true } }) };
  get.mockResolvedValue({ docs: [doc] });
  const expected = { id: 'other', full_name: 'Member', experience_level: 'Beginner', interests: ['AI'], created_at: '2026-01-01' };
  const res = await GET(new Request('https://example.test/api/directory'));
  expect(res.headers.get('cache-control')).toContain('no-store');
  expect(await res.json()).toEqual({ members: [expected] });
  get.mockResolvedValue(doc);
  expect(await (await GET(new Request('https://example.test/api/directory?id=other'))).json()).toEqual({ member: expected });
});

it('includes profiles that have no creation timestamp', async () => {
  const { GET } = await import('@/app/api/directory/route');
  userFromRequest.mockResolvedValue({ uid: 'member' });
  get.mockResolvedValue({ docs: [{ id: 'new', data: () => ({ full_name: 'New member', updated_at: '2026-01-01' }) }] });
  expect((await (await GET(new Request('https://example.test/api/directory'))).json()).members[0]).toMatchObject({ id: 'new', full_name: 'New member' });
});
