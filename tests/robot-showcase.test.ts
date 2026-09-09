import { describe, expect, it } from 'vitest';
import { ROBOT_SHOWCASE, sortRobotShowcase } from '@/lib/robot-showcase';

describe('showcase order', () => {
  it('uses addition chronology and preserves all original artwork IDs', () => {
    expect(sortRobotShowcase(ROBOT_SHOWCASE, 'newest').map(robot => robot.id)).toEqual([
      'praxis-council-afterimage', 'claude-fable-5-1', 'gpt-6-open-seat', 'claude-fable-5', 'claude-opus-4-5', 'gpt-51-codex-max', 'gemini-3-unit-01',
    ]);
  });
  it('sorts by saved totals and resolves equal totals newest first', () => {
    const ordered = sortRobotShowcase(ROBOT_SHOWCASE, 'top-voted', [
      { robotId: 'gemini-3-unit-01', count: 12, votedByMe: false },
      { robotId: 'claude-opus-4-5', count: 8, votedByMe: true },
      { robotId: 'claude-fable-5', count: 8, votedByMe: false },
    ]);
    expect(ordered.map(robot => robot.id)).toEqual([
      'gemini-3-unit-01', 'claude-fable-5', 'claude-opus-4-5', 'praxis-council-afterimage', 'claude-fable-5-1', 'gpt-6-open-seat', 'gpt-51-codex-max',
    ]);
  });
  it('keeps chronology with zero votes and leaves the source untouched', () => {
    const entries = [...ROBOT_SHOWCASE].reverse();
    const original = entries.map(robot => robot.id);
    expect(sortRobotShowcase(entries, 'top-voted')).toEqual(sortRobotShowcase(entries, 'newest'));
    expect(entries.map(robot => robot.id)).toEqual(original);
  });
});
