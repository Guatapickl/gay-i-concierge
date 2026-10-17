import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
import NewsCard, { DISCUSS_LABEL, discussionCountLabel, type DiscussionState } from '@/components/NewsCard';
import type { NewsItem } from '@/types/supabase';

const item: NewsItem = {
  id: 'story-a', title: 'A story', summary: 'Summary', source_url: 'https://example.com/a', source_name: 'Example', tag: 'Research',
  tag_color: null, published_at: '2026-09-10T00:00:00.000Z', ingested_at: '2026-09-10T00:00:00.000Z', is_hot: false, relevance_score: null,
};
const render = (props: { userId: string | null; discussion?: DiscussionState; withHandler?: boolean }) =>
  renderToStaticMarkup(
    <NewsCard item={item} isSaved={false} userId={props.userId} onToggleSave={() => {}} discussion={props.discussion} onToggleDiscussion={props.withHandler === false ? undefined : async () => {}} />,
  );

/** The vote button's own opening tag and content, so `disabled=""` checks do not trip over Tailwind's `disabled:` classes on other buttons. */
const voteButton = (html: string) => html.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*I want to talk about this<\/button>/)?.[0] ?? '';

describe('NewsCard discussion vote', () => {
  it('shows the exact "I want to talk about this" action with the total and own-vote state for signed-in members', () => {
    expect(DISCUSS_LABEL).toBe('I want to talk about this');
    const open = render({ userId: 'u1', discussion: { count: 2, votedByMe: false } });
    expect(open).toContain('>I want to talk about this</button>');
    expect(voteButton(open)).not.toContain('disabled=""');
    expect(open).toContain('aria-pressed="false"');
    expect(open).toContain('2 votes');
    expect(open).toContain('data-discussion="open"');

    const voted = render({ userId: 'u1', discussion: { count: 1, votedByMe: true } });
    expect(voted).toContain('aria-pressed="true"');
    expect(voted).toContain('1 vote<');
    expect(voted).toContain('data-discussion="voted"');
    expect(voted).toContain('Withdraw your vote');
  });

  it('keeps loading and unavailable apart from zero votes', () => {
    expect(discussionCountLabel(undefined)).toBe('Loading votes…');
    expect(discussionCountLabel(null)).toBe('Vote count unavailable');
    expect(discussionCountLabel({ count: 0, votedByMe: false })).toBe('0 votes');
    const unavailable = render({ userId: 'u1', discussion: null });
    expect(unavailable).toContain('Vote count unavailable');
    expect(unavailable).toContain('data-discussion="unavailable"');
    expect(unavailable).not.toContain('0 votes');
    expect(unavailable).toContain('>I want to talk about this</button>');
    const loading = render({ userId: 'u1', discussion: undefined });
    expect(loading).toContain('data-discussion="loading"');
    // The own-vote state is unknown while loading or unavailable, so the button cannot toggle it.
    expect(voteButton(loading)).toContain('disabled=""');
    expect(voteButton(unavailable)).toContain('disabled=""');
    expect(voteButton(render({ userId: 'u1', discussion: { count: 0, votedByMe: false } }))).not.toContain('disabled=""');
  });

  it('hides the action for signed-out visitors and when the feed did not wire the handler', () => {
    expect(render({ userId: null, discussion: { count: 5, votedByMe: false } })).not.toContain('I want to talk about this');
    expect(render({ userId: 'u1', discussion: { count: 5, votedByMe: false }, withHandler: false })).not.toContain('I want to talk about this');
  });
});
