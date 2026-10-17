import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import VotedArticles, { isDiscussed, refreshedLabel, votesLabel, type VotedArticlesState } from '@/components/VotedArticles';
import type { DiscussionArticle } from '@/lib/news-discussion-types';

const base: DiscussionArticle = { news_id: 'a', title: 'Story A', source_url: 'https://example.com/a', source_name: 'Example', published_at: '2026-09-10T12:00:00.000Z', count: 3, voted_by_me: true, on_agendas: [] };
const planned: DiscussionArticle = { ...base, news_id: 'b', title: 'Story B', source_url: 'https://example.com/b', count: 1, on_agendas: [{ event_id: 'later', title: 'October meetup', event_datetime: '2099-10-11T22:30:00.000Z', is_upcoming: true }] };
const discussed: DiscussionArticle = { ...base, news_id: 'c', title: 'Story C', source_url: 'https://example.com/c', count: 2, on_agendas: [{ event_id: 'past', title: 'August meetup', event_datetime: '2000-08-01T22:30:00.000Z', is_upcoming: false }] };

const render = (state: VotedArticlesState, opts: { onDraft?: string[]; hideDiscussed?: boolean; selected?: string | null } = {}) =>
  renderToStaticMarkup(
    <VotedArticles
      state={state}
      selectedEventId={opts.selected ?? null}
      placement={a => ({ onDraft: (opts.onDraft ?? []).includes(a.news_id) })}
      hideDiscussed={opts.hideDiscussed ?? true}
      onHideDiscussedChange={() => {}}
      onAdd={() => {}}
      onRefresh={() => {}}
    />,
  );

describe('VotedArticles panel', () => {
  it('renders loading, signed-out, error and empty states distinctly', () => {
    expect(render({ status: 'loading' })).toContain('data-state="loading"');
    expect(render({ status: 'signed-out' })).toContain('Sign in to see');
    const error = render({ status: 'error', message: 'Request failed (HTTP 500).' });
    expect(error).toContain('data-state="error"');
    expect(error).toContain('Could not load voted stories: Request failed (HTTP 500).');
    expect(error).toContain('not a zero-vote result');
    expect(error).toContain('Retry');
    expect(error).not.toContain('No votes yet');
    const empty = render({ status: 'ready', articles: [], generatedAt: 'now' });
    expect(empty).toContain('data-state="empty"');
    expect(empty).toContain('No votes yet');
  });

  it('lists stories with title link, source, vote count and an Add button, in the order given', () => {
    const html = render({ status: 'ready', articles: [base, planned], generatedAt: 'now' });
    expect(html).toContain('data-state="ready"');
    expect(html.indexOf('Story A')).toBeLessThan(html.indexOf('Story B'));
    expect(html).toContain('href="https://example.com/a"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html.replace(/<[^>]+>/g, '')).toContain('Example · Sep 10, 2026');
    expect(html).toContain('3 votes');
    expect(html).toContain('1 vote<');
    expect(html).toContain('aria-label="Add Story A to the agenda"');
    expect(votesLabel(1)).toBe('1 vote');
    expect(votesLabel(0)).toBe('0 votes');
  });

  it('marks stories already on this agenda, planned for another meeting, or discussed in the past', () => {
    const html = render({ status: 'ready', articles: [base, planned, discussed], generatedAt: 'now' }, { onDraft: ['a'], hideDiscussed: false, selected: 'next' });
    expect(html).toContain('data-news-id="a" data-on-draft="true"');
    expect(html).toContain('On this agenda');
    expect(html).toContain('aria-label="Story A is already on this agenda"');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*<svg[^>]*>[\s\S]*?<\/svg>Added<\/button>/);
    expect(html).toContain('Planned for October meetup · Oct 11, 2099');
    expect(html).toContain('Discussed Aug 1, 2000');
    expect(isDiscussed(discussed)).toBe(true);
    expect(isDiscussed(planned)).toBe(false);
    // A story planned for the selected event itself is "on this agenda", not "planned elsewhere".
    const same = render({ status: 'ready', articles: [planned], generatedAt: 'now' }, { selected: 'later' });
    expect(same).not.toContain('Planned for');
  });

  it('hides discussed stories by default and says how many are hidden', () => {
    const hidden = render({ status: 'ready', articles: [base, discussed], generatedAt: 'now' });
    expect(hidden).toContain('Story A');
    expect(hidden).not.toContain('Story C');
    expect(hidden).toContain('(1 hidden)');
    const only = render({ status: 'ready', articles: [discussed], generatedAt: 'now' });
    expect(only).toContain('data-state="all-discussed"');
    expect(only).not.toContain('No votes yet');
    const shown = render({ status: 'ready', articles: [discussed], generatedAt: 'now' }, { hideDiscussed: false });
    expect(shown).toContain('Story C');
  });

  it('shows when the list was last refreshed', () => {
    const at = '2026-09-13T18:05:00.000Z';
    expect(refreshedLabel(at)).toMatch(/^Last refreshed \d{1,2}:\d{2} (AM|PM)$/);
    expect(refreshedLabel('now')).toBeNull();
    const html = render({ status: 'ready', articles: [base], generatedAt: at });
    expect(html).toContain(`data-refreshed="${at}"`);
    expect(html).toContain('Last refreshed');
    expect(render({ status: 'ready', articles: [], generatedAt: at })).toContain('Last refreshed');
    expect(render({ status: 'ready', articles: [base], generatedAt: 'now' })).not.toContain('Last refreshed');
  });
});
