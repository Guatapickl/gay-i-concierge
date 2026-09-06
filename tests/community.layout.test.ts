import { it, expect, vi, beforeEach } from 'vitest';
const { getServerUser, redirect } = vi.hoisted(() => ({ getServerUser: vi.fn(), redirect: vi.fn(() => { throw new Error('redirect'); }) }));
vi.mock('@/lib/firebase/session', () => ({ getServerUser }));
vi.mock('next/navigation', () => ({ redirect }));
import Layout from '@/app/community/layout';
beforeEach(() => vi.clearAllMocks());
it('requires a verified session before rendering any community page', async () => {
  getServerUser.mockResolvedValue(null);
  await expect(Layout({ children: 'private directory' })).rejects.toThrow('redirect');
  expect(redirect).toHaveBeenCalledWith('/auth/sign-in');
});
it('allows a verified member through the directory boundary', async () => {
  getServerUser.mockResolvedValue({ uid: 'member' });
  expect(await Layout({ children: 'directory' })).toBe('directory');
  expect(redirect).not.toHaveBeenCalled();
});
