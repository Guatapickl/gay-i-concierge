import { describe, it, expect } from 'vitest';
import { generateToken, expiresIn } from '@/lib/tokens';
import { rateLimit } from '@/lib/rateLimit';

describe('tokens', () => {
  it('generates hex token of expected length', () => {
    const t = generateToken(16);
    expect(t).toMatch(/^[a-f0-9]{32}$/);
  });
  it('computes expiry ISO string', () => {
    const iso = expiresIn(1);
    expect(new Date(iso).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('rateLimit', () => {
  it('allows within limit and blocks after', () => {
    const id = `test-${Math.random()}`;
    let allowed = 0;
    for (let i = 0; i < 3; i++) if (rateLimit(id, 2, 60_000)) allowed++;
    expect(allowed).toBe(2);
  });
});

