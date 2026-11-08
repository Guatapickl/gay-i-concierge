import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { profileSavePayload } from '@/lib/profileSave';

const input = { userId: 'uid-1', fullName: ' Robin Member ', betaOptIn: true, experienceLevel: 'beginner', interests: ['AI', 'Art'], email: 'robin@example.test', updatedAt: '2026-11-07T10:00:00.000Z' };

describe('profile save payload', () => {
  it('keeps member data and never writes created_at, so a merge preserves the sign-up time', () => {
    const payload = profileSavePayload(input);
    expect(payload).toEqual({ id: 'uid-1', full_name: 'Robin Member', beta_opt_in: true, experience_level: 'beginner', interests: ['AI', 'Art'], email: 'robin@example.test', updated_at: '2026-11-07T10:00:00.000Z' });
    expect('created_at' in payload).toBe(false);
  });
  it.each(['', '   '])('stores an empty name %j as null rather than a blank heading', fullName => {
    expect(profileSavePayload({ ...input, fullName }).full_name).toBeNull();
  });
  it('is merged by the Profile page instead of replacing the document', () => {
    const source = readFileSync('app/profile/page.tsx', 'utf8');
    expect(source).toMatch(/setDoc\(ref\('user_profiles', userId\), payloadOf\(profileSavePayload\(\{[\s\S]*?\}\)\), \{ merge: true \}\)/);
    expect(source).not.toMatch(/created_at\s*:/);
  });
});
