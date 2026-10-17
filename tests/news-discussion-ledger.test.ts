import { describe, expect, it } from 'vitest';
import { DiscussionLedger, type VoteTotals } from '@/lib/news-discussion-ledger';

describe('DiscussionLedger', () => {
  it('does not let a GET that started before a successful PUT erase the vote', () => {
    const ledger = new DiscussionLedger();
    const token = ledger.beginLoad();          // slow GET starts (server has no vote yet)
    let screen: VoteTotals = {};
    ledger.recordVote('story');                 // PUT succeeds first
    screen = { ...screen, story: { count: 1, votedByMe: true } };
    // The GET now completes with the pre-vote answer: nothing for "story".
    expect(ledger.isLatestLoad(token)).toBe(true);
    screen = ledger.mergeLoad(token, screen, {});
    expect(screen).toEqual({ story: { count: 1, votedByMe: true } });
    // Other stories in the same GET are still applied.
    screen = ledger.mergeLoad(token, screen, { other: { count: 4, votedByMe: false } });
    expect(screen).toEqual({ story: { count: 1, votedByMe: true }, other: { count: 4, votedByMe: false } });
  });

  it('applies a GET that started after the PUT, since it already reflects the vote', () => {
    const ledger = new DiscussionLedger();
    ledger.recordVote('story');
    const token = ledger.beginLoad();
    const screen = ledger.mergeLoad(token, { story: { count: 1, votedByMe: true } }, { story: { count: 2, votedByMe: true } });
    expect(screen).toEqual({ story: { count: 2, votedByMe: true } });
  });

  it('ignores a load once a newer one has started', () => {
    const ledger = new DiscussionLedger();
    const first = ledger.beginLoad();
    const second = ledger.beginLoad();
    expect(ledger.isLatestLoad(first)).toBe(false);
    expect(ledger.isLatestLoad(second)).toBe(true);
  });

  it('keeps a withdrawal that landed after a slow load began', () => {
    const ledger = new DiscussionLedger();
    const token = ledger.beginLoad();
    ledger.recordVote('story');
    const screen = ledger.mergeLoad(token, { story: { count: 0, votedByMe: false } }, { story: { count: 1, votedByMe: true } });
    expect(screen).toEqual({ story: { count: 0, votedByMe: false } });
  });
});
