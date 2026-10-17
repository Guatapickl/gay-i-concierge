import { createHash } from 'node:crypto';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from './firebase/admin';
import { adminRowOf } from './firebase/adminDb';
import { agendaContainsArticle } from './agendaArticles';
import type { DiscussionAgendaRef, DiscussionArticle, DiscussionList, DiscussionVoteSummary } from './news-discussion-types';
import type { AgendaItem } from '@/types/supabase';

/**
 * "I want to talk about this" votes on news stories (server side, Admin SDK).
 *
 * - One vote per member per story. The document id is a hash of
 *   [news_id, user_id] and the write is a `create` inside a transaction, so a
 *   retried or concurrent request cannot add a second document. Totals are
 *   counted from the documents, never from a counter that could drift.
 * - A member can withdraw a vote. The document is kept and marked
 *   `active: false` with `withdrawn_at`, so the history of a vote (first cast,
 *   withdrawals, re-votes) stays on record; only active documents count. Voting
 *   again clears the marker on the same document. Nothing deletes vote
 *   documents: removing a story from the feed leaves its votes in place; they
 *   are just not listed while the story is gone.
 * - Responses carry totals and the caller's own choice only. Voter identities
 *   stay in the server-only collection (client access is denied in
 *   firestore.rules).
 * - Lifecycle: votes belong to the general "next meeting" pool, like agenda
 *   suggestions with `event_id: null`. They are not attached to any meeting and
 *   never expire on their own. An organizer decides in the agenda maker which
 *   voted stories go on which agenda; `on_agendas` reports where a story has
 *   already been placed so an old favourite is not put on every future agenda
 *   by accident.
 */
export const NEWS_DISCUSSION_COLLECTION = 'news_discussion_votes';
export const NEWS_ID_PATTERN = /^[\w-]{1,200}$/;
export const MAX_DISCUSSION_IDS = 100;
/** How many recent meetings are scanned for "already on an agenda". */
export const AGENDA_SCAN_LIMIT = 60;

export type { DiscussionAgendaRef, DiscussionArticle, DiscussionList, DiscussionVoteSummary };

export class NewsDiscussionError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'NewsDiscussionError';
    this.status = status;
  }
}

export function newsDiscussionVoteId(newsId: string, userId: string): string {
  return createHash('sha256').update(JSON.stringify([newsId, userId])).digest('hex');
}

export function validateNewsDiscussionVote(input: unknown): { newsId: string; voted: boolean } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new NewsDiscussionError('Choose a story and a vote.', 400);
  const { newsId, voted } = input as Record<string, unknown>;
  if (typeof newsId !== 'string' || !NEWS_ID_PATTERN.test(newsId) || typeof voted !== 'boolean') {
    throw new NewsDiscussionError('Choose a story and a vote.', 400);
  }
  return { newsId, voted };
}

/** Parse the optional `ids` query parameter (comma separated). Null means "every voted story". */
export function parseNewsIdList(raw: string | null | undefined): string[] | null {
  if (raw == null || raw.trim() === '') return null;
  const ids = Array.from(new Set(raw.split(',').map(part => part.trim()).filter(Boolean)));
  if (ids.length === 0 || ids.length > MAX_DISCUSSION_IDS || ids.some(id => !NEWS_ID_PATTERN.test(id))) {
    throw new NewsDiscussionError(`Provide between 1 and ${MAX_DISCUSSION_IDS} valid story ids.`, 400);
  }
  return ids;
}

type VoteDoc = { id: string; data: () => Record<string, unknown> | undefined };

/** A withdrawn vote stays on record with `active: false`; documents written before the flag existed count as active. */
export const isActiveVote = (row: Record<string, unknown>): boolean => row.active !== false;

/**
 * Group valid, active vote documents by story. Malformed or misfiled documents
 * are ignored rather than counted, and withdrawn documents are skipped.
 */
export function tallyVotes(docs: readonly VoteDoc[]): Map<string, Set<string>> {
  const tally = new Map<string, Set<string>>();
  for (const doc of docs) {
    const row = doc.data() ?? {};
    const newsId = row.news_id;
    const userId = row.user_id;
    if (typeof newsId !== 'string' || typeof userId !== 'string') continue;
    if (doc.id !== newsDiscussionVoteId(newsId, userId)) continue;
    if (!isActiveVote(row)) continue;
    if (!tally.has(newsId)) tally.set(newsId, new Set());
    tally.get(newsId)!.add(userId);
  }
  return tally;
}

/** Most votes first; ties go to the newest story, then to the id so the order is stable. */
export function sortDiscussionArticles(articles: readonly DiscussionArticle[]): DiscussionArticle[] {
  return [...articles].sort(
    (a, b) => b.count - a.count || (b.published_at ?? '').localeCompare(a.published_at ?? '') || a.news_id.localeCompare(b.news_id),
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadVoteDocs(db: Firestore, ids: string[] | null): Promise<QueryDocumentSnapshot[]> {
  const votes = db.collection(NEWS_DISCUSSION_COLLECTION);
  if (!ids) return (await votes.get()).docs;
  const docs: QueryDocumentSnapshot[] = [];
  for (const part of chunk(ids, 30)) docs.push(...(await votes.where('news_id', 'in', part).get()).docs);
  return docs;
}

type EventAgenda = { ref: DiscussionAgendaRef; agenda: AgendaItem[] };
type EventRow = { id: string; title?: unknown; event_datetime?: string | null; agenda?: unknown };

async function loadRecentAgendas(db: Firestore): Promise<EventAgenda[]> {
  const snap = await db.collection('events').orderBy('event_datetime', 'desc').limit(AGENDA_SCAN_LIMIT).get();
  const now = Date.now();
  const out: EventAgenda[] = [];
  for (const doc of snap.docs) {
    const row = adminRowOf<EventRow>(doc);
    if (!Array.isArray(row.agenda) || row.agenda.length === 0) continue;
    const when = row.event_datetime ?? null;
    out.push({
      ref: {
        event_id: row.id,
        title: typeof row.title === 'string' ? row.title : '',
        event_datetime: when,
        is_upcoming: when !== null && new Date(when).getTime() >= now,
      },
      agenda: row.agenda as AgendaItem[],
    });
  }
  return out;
}

type NewsRow = { id: string; title?: unknown; source_url?: unknown; source_name?: unknown; published_at?: string | null };

/**
 * Voted stories with totals and the caller's own choice. `ids` limits the
 * answer to those stories (the feed asks for the stories it shows); stories
 * with no votes are simply absent. `includeAgendas` adds `on_agendas`.
 * Any read failure is thrown; it is never reported as "no votes".
 */
export async function listNewsDiscussion(
  userId: string,
  options: { ids?: string[] | null; includeAgendas?: boolean } = {},
): Promise<DiscussionList> {
  const db = adminDb();
  const tally = tallyVotes(await loadVoteDocs(db, options.ids ?? null));
  const generated_at = new Date().toISOString();
  const newsIds = [...tally.keys()];
  if (newsIds.length === 0) return { articles: [], generated_at };
  const [stories, agendas] = await Promise.all([
    db.getAll(...newsIds.map(id => db.collection('news_items').doc(id))),
    options.includeAgendas ? loadRecentAgendas(db) : Promise.resolve([] as EventAgenda[]),
  ]);
  const articles: DiscussionArticle[] = [];
  for (const snap of stories) {
    if (!snap.exists) continue;
    const row = adminRowOf<NewsRow>(snap);
    const voters = tally.get(snap.id) ?? new Set<string>();
    const source_url = typeof row.source_url === 'string' ? row.source_url : '';
    articles.push({
      news_id: snap.id,
      title: typeof row.title === 'string' ? row.title : '',
      source_url,
      source_name: typeof row.source_name === 'string' ? row.source_name : null,
      published_at: row.published_at ?? null,
      count: voters.size,
      voted_by_me: voters.has(userId),
      on_agendas: agendas.filter(event => agendaContainsArticle(event.agenda, { news_id: snap.id, source_url })).map(event => event.ref),
    });
  }
  return { articles: sortDiscussionArticles(articles), generated_at };
}

const countOf = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

/**
 * Save the caller's desired state for one story and return the fresh total.
 * Voting for a story that is no longer in the feed fails with 404; withdrawing
 * is always allowed so a member can clean up after a removal.
 *
 * The write is idempotent: a request that matches the stored state writes
 * nothing, a first vote creates the document, a withdrawal marks it inactive
 * and a later vote reactivates the same document. `vote_count` and
 * `withdrawal_count` keep the running history on the record.
 */
export async function saveNewsDiscussionVote(userId: string, input: { newsId: string; voted: boolean }): Promise<DiscussionVoteSummary> {
  const { newsId, voted } = validateNewsDiscussionVote(input);
  const db = adminDb();
  const storyRef = db.collection('news_items').doc(newsId);
  const voteRef = db.collection(NEWS_DISCUSSION_COLLECTION).doc(newsDiscussionVoteId(newsId, userId));
  await db.runTransaction(async tx => {
    const [story, existing] = await Promise.all([tx.get(storyRef), tx.get(voteRef)]);
    if (voted && !story.exists) throw new NewsDiscussionError('This story is no longer in the feed.', 404);
    const now = new Date();
    const row = existing.exists ? existing.data() ?? {} : null;
    if (!row) {
      if (voted) {
        tx.create(voteRef, { news_id: newsId, user_id: userId, active: true, created_at: now, updated_at: now, withdrawn_at: null, vote_count: 1, withdrawal_count: 0 });
      }
      return;
    }
    const active = isActiveVote(row);
    if (voted && !active) {
      tx.update(voteRef, { active: true, updated_at: now, withdrawn_at: null, revoted_at: now, vote_count: countOf(row.vote_count) + 1 });
    } else if (!voted && active) {
      tx.update(voteRef, { active: false, updated_at: now, withdrawn_at: now, withdrawal_count: countOf(row.withdrawal_count) + 1 });
    }
  });
  const snap = await db.collection(NEWS_DISCUSSION_COLLECTION).where('news_id', '==', newsId).get();
  const voters = tallyVotes(snap.docs).get(newsId) ?? new Set<string>();
  return { news_id: newsId, count: voters.size, voted_by_me: voters.has(userId) };
}
