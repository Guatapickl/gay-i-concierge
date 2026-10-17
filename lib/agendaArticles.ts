/**
 * Dependency-free helpers for placing voted news stories on an agenda. Safe to
 * import from client components and from server code alike.
 *
 * Article identity: a news item keeps its Firestore id across ingestion
 * refreshes (the id is a hash of the canonical source URL), so an agenda item
 * remembers both `news_id` and the `link`. Matching accepts either one, which
 * keeps "already on this agenda" right for hand-pasted links too.
 */
export type ArticleRef = { news_id?: string | null; source_url?: string | null };
export type LinkedAgendaItem = { news_id?: string | null; link?: string | null } | null | undefined;

/** Same normalisation as `canonicalNewsUrl` in lib/news-ingestion.ts, which is server-only. */
export function canonicalArticleUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return null;
  }
}

/** Host name shown next to an agenda link ("openai.com"); null when the link is not a web URL. */
export function articleHost(link: unknown): string | null {
  const canonical = canonicalArticleUrl(link);
  if (!canonical) return null;
  return new URL(canonical).hostname.replace(/^www\./, '');
}

export function agendaItemMatchesArticle(item: LinkedAgendaItem, article: ArticleRef): boolean {
  if (!item) return false;
  if (article.news_id && item.news_id && item.news_id === article.news_id) return true;
  const wanted = canonicalArticleUrl(article.source_url);
  const have = canonicalArticleUrl(item.link);
  return wanted !== null && have !== null && wanted === have;
}

export function agendaContainsArticle(items: readonly LinkedAgendaItem[] | null | undefined, article: ArticleRef): boolean {
  return Array.isArray(items) && items.some(item => agendaItemMatchesArticle(item, article));
}

/**
 * Append the articles that are not already on the agenda. Existing items are
 * never modified, removed or reordered, and a second call with the same
 * articles adds nothing.
 */
export function appendArticles<T extends { news_id?: string | null; link?: string | null }, A extends ArticleRef>(
  items: readonly T[],
  articles: readonly A[],
  build: (article: A) => T,
): { items: T[]; added: A[]; skipped: A[] } {
  const next = [...items];
  const added: A[] = [];
  const skipped: A[] = [];
  for (const article of articles) {
    if (agendaContainsArticle(next, article)) {
      skipped.push(article);
      continue;
    }
    next.push(build(article));
    added.push(article);
  }
  return { items: next, added, skipped };
}

export type SavedAgendaLike = { title?: string | null; news_id?: string | null; link?: string | null };
export type DraftAgendaLike = { text: string; news_id?: string | null; link?: string | null; from_event?: string | null };

const sameTitle = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

const hasArticle = (item: { news_id?: string | null; link?: string | null }) => !!item.news_id || !!canonicalArticleUrl(item.link);

/**
 * True when a draft line is already represented on the saved agenda. A line
 * that carries a story (news_id or link) matches only by that story, so a
 * plain saved line with the same words never swallows a linked article. A
 * plain draft line matches by title.
 */
export function draftItemOnSaved(draft: DraftAgendaLike, saved: readonly SavedAgendaLike[]): boolean {
  if (hasArticle(draft)) return saved.some(item => agendaItemMatchesArticle(item, { news_id: draft.news_id, source_url: draft.link }));
  return saved.some(item => sameTitle(item.title, draft.text));
}

/**
 * Rebuild a draft around an event's saved agenda so that saving never
 * overwrites what is already stored. The saved items come first, exactly as
 * saved (time, speaker, notes, link); draft lines that are not on the saved
 * agenda follow them. Lines loaded earlier from another event's agenda are
 * dropped even when the chosen event has nothing saved yet (they belong to
 * that other event), and an untouched default draft is replaced outright
 * rather than appending template lines to a real agenda. With nothing saved,
 * an untouched template stays as it is and an edited draft keeps only the
 * editor's own lines; `items` may then be empty.
 */
export function mergeSavedAgenda<D extends DraftAgendaLike, S extends SavedAgendaLike>(
  draft: readonly D[],
  saved: readonly (S | null | undefined)[],
  build: (item: S) => D,
  options: { pristine: boolean },
): { items: D[]; loaded: number; kept: number; dropped: number } {
  const stored = saved.filter((item): item is S => !!item && !!item.title);
  if (stored.length === 0) {
    if (options.pristine) return { items: [...draft], loaded: 0, kept: draft.length, dropped: 0 };
    const own = draft.filter(item => !item.from_event);
    return { items: own, loaded: 0, kept: own.length, dropped: draft.length - own.length };
  }
  const kept = options.pristine ? [] : draft.filter(item => !item.from_event && !draftItemOnSaved(item, stored));
  return { items: [...stored.map(build), ...kept], loaded: stored.length, kept: kept.length, dropped: draft.length - kept.length };
}

/** Two saved lines describe the same thing: the same story, or (for plain lines) the same title. */
export function sameSavedLine(a: SavedAgendaLike, b: SavedAgendaLike): boolean {
  if (hasArticle(a) || hasArticle(b)) return agendaItemMatchesArticle(a, { news_id: b.news_id, source_url: b.link });
  return sameTitle(a.title, b.title);
}

/**
 * Decide what to store when an editor saves a draft that was built from
 * `baseline` (the agenda as loaded into the maker) while the event now holds
 * `stored` (what is in the database at save time). The editor's draft wins for
 * everything they saw; lines that another editor added after the baseline was
 * taken are appended so they survive the save instead of being overwritten.
 */
export function reconcileSavedAgenda<S extends SavedAgendaLike>(
  draft: readonly S[],
  baseline: readonly (S | null | undefined)[],
  stored: readonly (S | null | undefined)[],
): { agenda: S[]; preserved: S[] } {
  const seen = baseline.filter((item): item is S => !!item && !!item.title);
  const current = stored.filter((item): item is S => !!item && !!item.title);
  const preserved = current.filter(item => !seen.some(known => sameSavedLine(known, item)) && !draft.some(mine => sameSavedLine(mine, item)));
  return { agenda: [...draft, ...preserved], preserved };
}
