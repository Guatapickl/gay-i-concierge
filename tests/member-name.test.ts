import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MISSING_NAME_LABEL, memberDisplayName } from '@/lib/memberName';

describe('member display name', () => {
  it.each([null, undefined, '', '   '])('shows the neutral label for %j', value => {
    expect(memberDisplayName(value)).toBe(MISSING_NAME_LABEL);
    expect(memberDisplayName(value)).toBe('New member');
  });
  it('shows a real name trimmed', () => {
    expect(memberDisplayName('  kartik desai ')).toBe('kartik desai');
  });
  it('never looks like an email address', () => {
    expect(MISSING_NAME_LABEL).not.toContain('@');
  });
  it.each(['app/community/page.tsx', 'app/community/[id]/page.tsx'])('%s renders names through the shared label', file => {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('memberDisplayName(member.full_name)');
    expect(source).not.toContain('Anonymous Member');
    expect(source).not.toMatch(/member\.email/);
  });
});
