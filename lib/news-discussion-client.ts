/**
 * Browser helpers for "I want to talk about this" votes. Every failure is
 * thrown with the HTTP status when there is one; nothing here turns a failed
 * request into "no votes".
 */
import { authHeader } from './firebase/authClient';
import type { DiscussionList, DiscussionVoteSummary } from './news-discussion-types';

export class NewsDiscussionRequestError extends Error {
  /** HTTP status of the failed request, or null when the request never completed. */
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'NewsDiscussionRequestError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit, signedOutMessage: string): Promise<T> {
  const headers = await authHeader();
  if (!headers.Authorization) throw new NewsDiscussionRequestError(signedOutMessage, 401);
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { ...headers, ...(init.headers || {}) }, cache: 'no-store' });
  } catch (err) {
    throw new NewsDiscussionRequestError(`Could not reach the server (${(err as Error).message}).`, null);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = String((await res.json())?.error ?? '');
    } catch {
      /* non-JSON error body */
    }
    throw new NewsDiscussionRequestError(detail || `Request failed (HTTP ${res.status}).`, res.status);
  }
  return (await res.json()) as T;
}

/** Totals and the caller's own votes, optionally limited to `ids` and enriched with agenda placement. */
export function fetchNewsDiscussion(options: { ids?: string[]; agendas?: boolean } = {}): Promise<DiscussionList> {
  const params = new URLSearchParams();
  if (options.ids && options.ids.length > 0) params.set('ids', options.ids.join(','));
  if (options.agendas) params.set('agendas', '1');
  const query = params.toString();
  return request<DiscussionList>(`/api/news/discussion${query ? `?${query}` : ''}`, { method: 'GET' }, 'Sign in to see votes.');
}

/** Save whether the caller wants to talk about a story; returns the fresh total. */
export function saveNewsDiscussionVote(newsId: string, voted: boolean): Promise<DiscussionVoteSummary> {
  return request<DiscussionVoteSummary>(
    '/api/news/discussion',
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newsId, voted }) },
    'Sign in to vote.',
  );
}
