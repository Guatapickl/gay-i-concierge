/**
 * Ordering guard for the news feed's "I want to talk about this" totals.
 *
 * The feed reads totals in a batch (GET) and writes single votes (PUT). A slow
 * GET that started before a vote can finish after the vote's PUT succeeded;
 * applying it blindly would erase the fresh result and show the vote as
 * withdrawn. The ledger stamps every load and every saved vote on one clock,
 * so a finished load is ignored when a newer load has started and, per story,
 * never overrides a vote saved after that load began.
 */
export type VoteTotal = { count: number; votedByMe: boolean };
export type VoteTotals = Record<string, VoteTotal>;

export class DiscussionLedger {
  private clock = 0;
  private latestLoad = 0;
  private readonly savedAt = new Map<string, number>();

  /** Mark the start of a load and return its token. */
  beginLoad(): number {
    this.latestLoad = ++this.clock;
    return this.latestLoad;
  }

  /** True while no newer load has started since `token` was issued. */
  isLatestLoad(token: number): boolean {
    return token === this.latestLoad;
  }

  /** Record that the server confirmed a vote for `newsId` just now. */
  recordVote(newsId: string): void {
    this.savedAt.set(newsId, ++this.clock);
  }

  /**
   * Combine a finished load with the totals on screen: the load's numbers win,
   * except for stories whose vote was saved after the load began; those keep
   * the confirmed value from the PUT.
   */
  mergeLoad(token: number, current: VoteTotals, loaded: VoteTotals): VoteTotals {
    const next: VoteTotals = { ...loaded };
    for (const [newsId, at] of this.savedAt) {
      if (at > token && current[newsId]) next[newsId] = current[newsId];
    }
    return next;
  }
}
