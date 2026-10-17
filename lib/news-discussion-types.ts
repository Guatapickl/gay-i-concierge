/**
 * Shared shapes for "I want to talk about this" votes on news stories.
 * No imports, so both browser code and the server library can use them.
 */
export type DiscussionVoteSummary = {
  news_id: string;
  /** Number of members who currently want to talk about the story. */
  count: number;
  /** Whether the caller is one of them. */
  voted_by_me: boolean;
};

/** Where a voted story has already been placed. */
export type DiscussionAgendaRef = {
  event_id: string;
  title: string;
  event_datetime: string | null;
  /** True while the meeting is still ahead; false once it has passed. */
  is_upcoming: boolean;
};

export type DiscussionArticle = DiscussionVoteSummary & {
  title: string;
  source_url: string;
  source_name: string | null;
  published_at: string | null;
  /** Agendas (recent meetings, upcoming first) that already carry this story. Empty unless requested. */
  on_agendas: DiscussionAgendaRef[];
};

export type DiscussionList = {
  /** Voted stories still in the feed, most votes first (ties: newest story, then id). */
  articles: DiscussionArticle[];
  generated_at: string;
};
