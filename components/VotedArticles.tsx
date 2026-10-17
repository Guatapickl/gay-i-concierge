"use client";

import { Check, ExternalLink, MessageSquare, Plus, RefreshCw } from 'lucide-react';
import type { DiscussionArticle } from '@/lib/news-discussion-types';

/**
 * Agenda-maker panel listing news stories members voted for with
 * "I want to talk about this". Nothing is added automatically: an editor
 * picks each story, and the panel shows where a story already sits.
 */
export type VotedArticlesState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error'; message: string }
  | { status: 'ready'; articles: DiscussionArticle[]; generatedAt: string };

export type ArticlePlacement = {
  /** The story is already in the agenda being edited. */
  onDraft: boolean;
};

type Props = {
  state: VotedArticlesState;
  /** Event chosen under "Save to event", if any. */
  selectedEventId: string | null;
  placement: (article: DiscussionArticle) => ArticlePlacement;
  hideDiscussed: boolean;
  onHideDiscussedChange: (value: boolean) => void;
  onAdd: (article: DiscussionArticle) => void;
  onRefresh: () => void;
  refreshing?: boolean;
};

export const votesLabel = (count: number) => `${count} ${count === 1 ? 'vote' : 'votes'}`;

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'date not set';

/** "Last refreshed" stamp for the list; totals are read when the page opens and on Refresh. */
export const refreshedLabel = (iso: string): string | null => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return `Last refreshed ${at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

/** True once the story has been on the agenda of a meeting that already took place. */
export const isDiscussed = (article: DiscussionArticle) => article.on_agendas.some(a => !a.is_upcoming);

export default function VotedArticles({ state, selectedEventId, placement, hideDiscussed, onHideDiscussedChange, onAdd, onRefresh, refreshing }: Props) {
  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono">VOTED ARTICLES</div>
        <p className="text-xs text-foreground-muted mt-1">
          Stories members flagged with <q>I want to talk about this</q> on the news feed. Add the ones you want on this agenda; nothing is added on its own.
        </p>
      </div>
      {state.status !== 'signed-out' && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={state.status === 'loading' || refreshing}
          className="btn-secondary text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      )}
    </div>
  );

  if (state.status === 'loading') {
    return <section className="card p-4" data-state="loading" aria-busy="true">{header}<p className="text-sm text-foreground-muted">Loading voted stories…</p></section>;
  }
  if (state.status === 'signed-out') {
    return <section className="card p-4" data-state="signed-out">{header}<p className="text-sm text-foreground-muted">Sign in to see which stories members want to talk about.</p></section>;
  }
  if (state.status === 'error') {
    return (
      <section className="card p-4" data-state="error">
        {header}
        <p className="text-sm text-danger" role="alert">Could not load voted stories: {state.message}</p>
        <p className="text-xs text-foreground-muted mt-1">This is a load failure, not a zero-vote result. Retry, or open the news feed to check.</p>
        <button type="button" onClick={onRefresh} className="btn-secondary text-xs mt-3">Retry</button>
      </section>
    );
  }

  const visible = hideDiscussed ? state.articles.filter(a => !isDiscussed(a)) : state.articles;
  const hiddenCount = state.articles.length - visible.length;
  const refreshed = refreshedLabel(state.generatedAt);
  const toggle = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mt-3">
      <label className="inline-flex items-center gap-2 text-xs text-foreground-muted">
        <input type="checkbox" checked={hideDiscussed} onChange={e => onHideDiscussedChange(e.target.checked)} className="accent-[var(--color-primary)]" />
        Hide stories already discussed at a past meeting{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
      </label>
      {refreshed && <span className="text-xs text-foreground-faint" data-refreshed={state.generatedAt}>{refreshed}</span>}
    </div>
  );

  if (state.articles.length === 0) {
    return (
      <section className="card p-4" data-state="empty">
        {header}
        <p className="text-sm text-foreground-muted">No votes yet. Members vote with <q>I want to talk about this</q> on the news feed.</p>
        {refreshed && <p className="text-xs text-foreground-faint mt-2" data-refreshed={state.generatedAt}>{refreshed}</p>}
      </section>
    );
  }
  if (visible.length === 0) {
    return (
      <section className="card p-4" data-state="all-discussed">
        {header}
        <p className="text-sm text-foreground-muted">Every voted story has already been discussed at a past meeting. Show them to put one on the agenda again.</p>
        {toggle}
      </section>
    );
  }

  return (
    <section className="card p-4" data-state="ready">
      {header}
      <ol className="divide-y divide-border" aria-label="Voted articles">
        {visible.map(article => {
          const { onDraft } = placement(article);
          const elsewhere = article.on_agendas.filter(a => a.is_upcoming && a.event_id !== selectedEventId);
          const past = article.on_agendas.filter(a => !a.is_upcoming);
          return (
            <li key={article.news_id} data-news-id={article.news_id} data-on-draft={onDraft ? 'true' : 'false'} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-foreground hover:text-primary inline-flex items-start gap-1.5">
                  <span className="min-w-0">{article.title || article.source_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                </a>
                <p className="text-xs text-foreground-muted mt-0.5 break-words">
                  {article.source_name ? `${article.source_name} · ` : ''}<span className="whitespace-nowrap">{shortDate(article.published_at)}</span>
                </p>
                {(onDraft || elsewhere.length > 0 || past.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {onDraft && <span className="badge badge-primary"><Check className="w-3 h-3" aria-hidden="true" />On this agenda</span>}
                    {elsewhere.map(a => <span key={a.event_id} className="badge">Planned for {a.title || 'another meeting'} · {shortDate(a.event_datetime)}</span>)}
                    {past.map(a => <span key={a.event_id} className="badge">Discussed {shortDate(a.event_datetime)}</span>)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
              <span className="badge shrink-0"><MessageSquare className="w-3 h-3" aria-hidden="true" />{votesLabel(article.count)}</span>
              <button
                type="button"
                onClick={() => onAdd(article)}
                disabled={onDraft}
                aria-label={onDraft ? `${article.title} is already on this agenda` : `Add ${article.title} to the agenda`}
                className="btn-secondary text-xs inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {onDraft ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                {onDraft ? 'Added' : 'Add'}
              </button>
              </div>
            </li>
          );
        })}
      </ol>
      {toggle}
    </section>
  );
}
