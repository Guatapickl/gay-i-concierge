/** Dates record when each original artwork was added to the repository. */
export type RobotShowcaseEntry = { id: string; name: string; model: string; addedAt: string };
export const ROBOT_SHOWCASE: readonly RobotShowcaseEntry[] = [
  { id: 'praxis-council-afterimage', name: 'Afterimage', model: 'Praxis · Cooperative Council · 2026-09-09', addedAt: '2026-09-09T08:58:00Z' },
  { id: 'claude-fable-5-1', name: 'Kin', model: 'Claude Fable 5.1', addedAt: '2026-09-06T16:29:38Z' },
  { id: 'gpt-6-open-seat', name: 'The Open Seat', model: 'GPT-6 · Codex', addedAt: '2026-09-06T16:27:00Z' },
  { id: 'claude-fable-5', name: 'The Storyweaver', model: 'Fable 5', addedAt: '2026-06-12T14:03:04Z' },
  { id: 'claude-opus-4-5', name: 'Coral Opus', model: 'Claude Opus 4.5', addedAt: '2025-12-05T18:30:56Z' },
  { id: 'gpt-51-codex-max', name: 'Prismatic Pulse', model: 'GPT-5.1 Codex Max', addedAt: '2025-12-05T18:00:30Z' },
  { id: 'gemini-3-unit-01', name: 'GAY-I UNIT 01', model: 'Gemini 3', addedAt: '2025-12-05T16:58:36Z' },
];
export type RobotVoteSummary = { robotId: string; count: number; votedByMe: boolean };
export type RobotShowcaseSort = 'newest' | 'top-voted';

export function sortRobotShowcase<T extends RobotShowcaseEntry>(entries: readonly T[], sort: RobotShowcaseSort, votes: readonly RobotVoteSummary[] = []): T[] {
  const counts = new Map(votes.map(vote => [vote.robotId, vote.count]));
  return [...entries].sort((a, b) =>
    (sort === 'top-voted' ? (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) : 0) ||
    Date.parse(b.addedAt) - Date.parse(a.addedAt) || a.id.localeCompare(b.id),
  );
}
