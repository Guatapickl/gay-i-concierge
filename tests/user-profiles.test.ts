import { describe, expect, it, vi } from 'vitest';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { FakeAdminDb } from './_fakeAdminDb';
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: () => { throw new Error('tests inject their own db'); },
  adminAuth: () => { throw new Error('tests inject their own auth'); },
}));
import { basicProfile, ensureProfileForIdToken, ensureUserProfile, publicNameOf } from '@/lib/firebase/userProfiles';

const creationTime = 'Sun, 06 Sep 2026 14:03:11 GMT';
const createdIso = new Date(creationTime).toISOString();
const named = { uid: 'google-user', displayName: '  kartik desai ', email: 'member@example.test', metadata: { creationTime } };
const unnamed = { uid: 'password-user', email: 'quiet@example.test', metadata: { creationTime } };
const dbOf = (fake: FakeAdminDb) => fake as unknown as Firestore;

describe('basicProfile', () => {
  it('uses the account creation time, not now, and the trimmed display name', () => {
    const profile = basicProfile(named, new Date('2030-01-01T00:00:00Z'));
    expect(profile).toEqual({ id: 'google-user', full_name: 'kartik desai', created_at: Timestamp.fromDate(new Date(creationTime)) });
    expect(profile.created_at.toDate().toISOString()).toBe(createdIso);
  });
  it('stores null instead of inventing a name and never copies the email', () => {
    const profile = basicProfile(unnamed);
    expect(profile.full_name).toBeNull();
    expect(Object.keys(profile).sort()).toEqual(['created_at', 'full_name', 'id']);
    expect(JSON.stringify(profile)).not.toContain('@');
  });
  it.each(['', '   ', 'someone@example.test', null, undefined])('treats display name %j as no public name', value => {
    expect(publicNameOf(value)).toBeNull();
  });
  it('falls back to now only when Auth has no usable creation time', () => {
    const now = new Date('2026-11-07T10:00:00Z');
    expect(basicProfile({ uid: 'x', metadata: { creationTime: 'garbage' } }, now).created_at.toDate().toISOString()).toBe(now.toISOString());
    expect(basicProfile({ uid: 'x' }, now).created_at.toDate().toISOString()).toBe(now.toISOString());
  });
});

describe('ensureUserProfile', () => {
  it('creates the basic profile when the document is missing', async () => {
    const fake = new FakeAdminDb();
    const result = await ensureUserProfile(named, dbOf(fake));
    expect(result.created).toBe(true);
    expect(fake.rows('user_profiles')).toEqual([{ id: 'google-user', data: { id: 'google-user', full_name: 'kartik desai', created_at: Timestamp.fromDate(new Date(creationTime)) } }]);
  });
  it('never modifies an existing profile, whatever it contains', async () => {
    const existing = { id: 'google-user', full_name: 'Chosen Name', email: 'private@example.test', created_at: Timestamp.fromDate(new Date('2025-01-01T00:00:00Z')), interests: ['AI'] };
    const fake = new FakeAdminDb().seed('user_profiles', [{ id: 'google-user', data: existing }]);
    const result = await ensureUserProfile(named, dbOf(fake));
    expect(result).toEqual({ created: false, profile: null });
    expect(fake.rows('user_profiles')).toEqual([{ id: 'google-user', data: existing }]);
  });
  it('is idempotent and safe under concurrent first sign-ins', async () => {
    const fake = new FakeAdminDb();
    const results = await Promise.all(Array.from({ length: 6 }, () => ensureUserProfile(unnamed, dbOf(fake))));
    expect(results.filter(r => r.created)).toHaveLength(1);
    expect(fake.rows('user_profiles')).toHaveLength(1);
    expect((await ensureUserProfile(unnamed, dbOf(fake))).created).toBe(false);
    expect(fake.rows('user_profiles')[0].data).toEqual({ id: 'password-user', full_name: null, created_at: Timestamp.fromDate(new Date(creationTime)) });
  });
});

describe('ensureProfileForIdToken', () => {
  const authFor = (fake: FakeAdminDb) => {
    const auth = { verifyIdToken: vi.fn(async (token: string) => { if (token !== 'good') throw new Error('bad token'); return { uid: named.uid }; }), getUser: vi.fn(async () => named) };
    return { auth: auth as never, db: dbOf(fake), spies: auth };
  };
  it('verifies the token, then creates the profile from the Auth record', async () => {
    const fake = new FakeAdminDb();
    const deps = authFor(fake);
    expect((await ensureProfileForIdToken('good', deps)).created).toBe(true);
    expect(deps.spies.getUser).toHaveBeenCalledWith(named.uid);
    expect(fake.rows('user_profiles')[0].data).toMatchObject({ full_name: 'kartik desai' });
  });
  it('costs one read for returning members and leaves their profile alone', async () => {
    const fake = new FakeAdminDb().seed('user_profiles', [{ id: named.uid, data: { full_name: 'Kept' } }]);
    const deps = authFor(fake);
    expect((await ensureProfileForIdToken('good', deps)).created).toBe(false);
    expect(deps.spies.getUser).not.toHaveBeenCalled();
    expect(fake.rows('user_profiles')[0].data).toEqual({ full_name: 'Kept' });
  });
  it('rejects an invalid token without touching Firestore', async () => {
    const fake = new FakeAdminDb();
    await expect(ensureProfileForIdToken('forged', authFor(fake))).rejects.toThrow('bad token');
    expect(fake.rows('user_profiles')).toEqual([]);
  });
});
