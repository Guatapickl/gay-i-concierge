import { describe, expect, it } from 'vitest';
import { agendaContainsArticle, agendaItemMatchesArticle, appendArticles, articleHost, canonicalArticleUrl, draftItemOnSaved, mergeSavedAgenda, reconcileSavedAgenda, sameSavedLine, type LinkedAgendaItem } from '@/lib/agendaArticles';
import { canonicalNewsUrl } from '@/lib/news-ingestion';

const story = { news_id: 'story-1', source_url: 'https://openai.com/index/example?utm_source=rss&b=2&a=1#top' };

describe('agenda article helpers', () => {
  it('normalises links exactly like the ingestion pipeline, so agenda links match stored stories', () => {
    for (const raw of [
      story.source_url,
      'https://www.example.com/path/?fbclid=abc',
      'http://example.com',
      'https://example.com/a/b/',
      'ftp://example.com/x',
      'not a url',
      'https://user:pw@example.com/',
    ]) {
      expect(canonicalArticleUrl(raw)).toBe(canonicalNewsUrl(raw));
    }
    expect(canonicalArticleUrl(story.source_url)).toBe('https://openai.com/index/example?a=1&b=2');
    expect(articleHost('https://www.example.com/story')).toBe('example.com');
    expect(articleHost('javascript:alert(1)')).toBeNull();
    expect(articleHost(null)).toBeNull();
  });

  it('matches an agenda item by stable news id or by canonical link, never by title alone', () => {
    expect(agendaItemMatchesArticle({ news_id: 'story-1', link: null }, story)).toBe(true);
    expect(agendaItemMatchesArticle({ link: 'https://openai.com/index/example?b=2&a=1' }, story)).toBe(true);
    expect(agendaItemMatchesArticle({ link: 'https://openai.com/index/example?a=1&b=2&utm_medium=x' }, story)).toBe(true);
    expect(agendaItemMatchesArticle({ news_id: 'story-2', link: 'https://openai.com/other' }, story)).toBe(false);
    const plain = { title: 'Same title, no link' } as unknown as LinkedAgendaItem;
    expect(agendaItemMatchesArticle(plain, story)).toBe(false);
    expect(agendaItemMatchesArticle(null, story)).toBe(false);
    expect(agendaItemMatchesArticle({ link: 'https://openai.com/index/example' }, { news_id: null, source_url: null })).toBe(false);
    expect(agendaContainsArticle(undefined, story)).toBe(false);
    expect(agendaContainsArticle([plain, { news_id: 'story-1' }], story)).toBe(true);
  });

  it('adds each article once, keeps existing items untouched and is a no-op when repeated', () => {
    type Draft = { text: string; news_id?: string; link?: string };
    const existing: Draft[] = [{ text: 'Welcome' }, { text: 'Already here', link: 'https://openai.com/index/example?b=2&a=1' }];
    const second = { news_id: 'story-2', source_url: 'https://example.com/second', title: 'Second' };
    const build = (a: typeof second | typeof story) => ({ text: 'title' in a ? a.title : a.news_id, news_id: a.news_id, link: a.source_url });

    const first = appendArticles(existing, [story, second, second], build);
    expect(first.items.slice(0, 2)).toEqual(existing);
    expect(first.items).toHaveLength(3);
    expect(first.items[2]).toEqual({ text: 'Second', news_id: 'story-2', link: 'https://example.com/second' });
    expect(first.added).toEqual([second]);
    expect(first.skipped).toEqual([story, second]);

    const again = appendArticles(first.items, [story, second], build);
    expect(again.items).toEqual(first.items);
    expect(again.added).toEqual([]);
    expect(again.skipped).toHaveLength(2);
    expect(existing).toHaveLength(2);
  });

  it('loads a saved agenda ahead of the draft without losing stored details or duplicating lines', () => {
    type Draft = { text: string; note: string; time?: string | null; news_id?: string; link?: string; from_event?: string };
    type Saved = { title: string; time: string | null; notes: string | null; link?: string | null; news_id?: string | null };
    const saved: Saved[] = [
      { title: 'Welcome & introductions', time: null, notes: 'Bring name tags' },
      { title: 'Feature talk', time: '7:15 PM', notes: null },
      { title: 'Story on the agenda', time: null, notes: null, link: 'https://example.com/story?utm_source=x', news_id: 'story-1' },
    ];
    const build = (item: Saved): Draft => ({ text: item.title, note: item.notes ?? '', time: item.time, news_id: item.news_id ?? undefined, link: item.link ?? undefined, from_event: 'ev-1' });
    const template: Draft[] = [{ text: 'welcome & introductions', note: '' }, { text: 'AI news roundup', note: '' }];

    // An untouched template is replaced by the saved agenda.
    const pristine = mergeSavedAgenda(template, saved, build, { pristine: true });
    expect(pristine.items.map(i => i.text)).toEqual(['Welcome & introductions', 'Feature talk', 'Story on the agenda']);
    expect(pristine.items[0].note).toBe('Bring name tags');
    expect(pristine.items[1].time).toBe('7:15 PM');
    expect(pristine).toMatchObject({ loaded: 3, kept: 0 });

    // An edited draft keeps its own lines after the saved ones; matches by title or story are not repeated.
    const edited: Draft[] = [...template, { text: 'Same story, different title', note: '', link: 'https://example.com/story' }, { text: 'From another event', note: '', from_event: 'ev-0' }, { text: 'Brand new line', note: '' }];
    const merged = mergeSavedAgenda(edited, saved, build, { pristine: false });
    expect(merged.items.map(i => i.text)).toEqual(['Welcome & introductions', 'Feature talk', 'Story on the agenda', 'AI news roundup', 'Brand new line']);
    expect(merged).toMatchObject({ loaded: 3, kept: 2 });

    // Nothing saved yet: the editor's own lines stay, lines loaded from another event go back to that event.
    const empty = mergeSavedAgenda(edited, [null, { title: '', time: null, notes: null }], build, { pristine: false });
    expect(empty.items.map(i => i.text)).toEqual(['welcome & introductions', 'AI news roundup', 'Same story, different title', 'Brand new line']);
    expect(empty).toMatchObject({ loaded: 0, kept: 4, dropped: 1 });
    // An untouched template stays as it is when the chosen event has no agenda.
    expect(mergeSavedAgenda(template, [], build, { pristine: true })).toEqual({ items: template, loaded: 0, kept: 2, dropped: 0 });
  });

  it('switching from an event with a saved agenda to one without keeps only the selected article, not the previous event lines', () => {
    type Draft = { text: string; news_id?: string; link?: string; from_event?: string };
    type Saved = { title: string; link?: string | null; news_id?: string | null };
    const build = (eventId: string) => (item: Saved): Draft => ({ text: item.title, news_id: item.news_id ?? undefined, link: item.link ?? undefined, from_event: eventId });
    const eventA: Saved[] = [{ title: 'Welcome & introductions' }, { title: 'Story on A', link: 'https://example.com/on-a', news_id: 'on-a' }];
    // 1. Choose event A: the untouched template is replaced by A's agenda.
    const onA = mergeSavedAgenda([{ text: 'Welcome & introductions' }], eventA, build('A'), { pristine: true });
    expect(onA.items.every(i => i.from_event === 'A')).toBe(true);
    // 2. Add a voted story while A is selected.
    const withStory: Draft[] = [...onA.items, { text: 'My chosen story', link: 'https://example.com/chosen', news_id: 'chosen' }];
    // 3. Choose event B, which has no agenda yet: A's lines go back to A, the chosen story stays.
    const onB = mergeSavedAgenda(withStory, [], build('B'), { pristine: false });
    expect(onB.items).toEqual([{ text: 'My chosen story', link: 'https://example.com/chosen', news_id: 'chosen' }]);
    expect(onB).toMatchObject({ loaded: 0, kept: 1, dropped: 2 });
    // The same switch to an event that does have an agenda also drops A's lines and keeps the story after B's lines.
    const onC = mergeSavedAgenda(withStory, [{ title: 'C opening' }], build('C'), { pristine: false });
    expect(onC.items.map(i => [i.text, i.from_event ?? null])).toEqual([['C opening', 'C'], ['My chosen story', null]]);
  });

  it('keeps a linked article when the saved agenda has a plain line with the same title', () => {
    const saved = [{ title: 'Story title' }, { title: 'Welcome' }];
    expect(draftItemOnSaved({ text: 'Story title', link: 'https://example.com/story', news_id: 'story' }, saved)).toBe(false);
    expect(draftItemOnSaved({ text: 'Story title', link: 'https://example.com/story' }, saved)).toBe(false);
    expect(draftItemOnSaved({ text: 'story title' }, saved)).toBe(true);
    expect(draftItemOnSaved({ text: 'Other words', news_id: 'story' }, [{ title: 'Story title', news_id: 'story' }])).toBe(true);
    const merged = mergeSavedAgenda(
      [{ text: 'Story title', link: 'https://example.com/story', news_id: 'story' }, { text: 'Welcome' }],
      saved,
      item => ({ text: item.title, from_event: 'ev' }),
      { pristine: false },
    );
    expect(merged.items.map(i => [i.text, i.link ?? null])).toEqual([['Story title', null], ['Welcome', null], ['Story title', 'https://example.com/story']]);
  });

  it('reconciles a save with lines another editor stored after the draft was loaded', () => {
    type Saved = { title: string; time?: string | null; notes?: string | null; link?: string | null; news_id?: string | null };
    const baseline: Saved[] = [{ title: 'Welcome & introductions' }, { title: 'Feature talk', time: '7:15 PM' }];
    const draft: Saved[] = [...baseline, { title: 'My story', link: 'https://example.com/mine', news_id: 'mine' }];
    const stored: Saved[] = [...baseline, { title: 'Added by another editor after page load', notes: 'keep me' }, { title: 'My story', link: 'https://example.com/mine?utm_source=x' }];
    const result = reconcileSavedAgenda(draft, baseline, stored);
    expect(result.agenda.map(i => i.title)).toEqual(['Welcome & introductions', 'Feature talk', 'My story', 'Added by another editor after page load']);
    expect(result.agenda[3].notes).toBe('keep me');
    expect(result.preserved.map(i => i.title)).toEqual(['Added by another editor after page load']);
    // Unchanged store: the draft is written as is.
    expect(reconcileSavedAgenda(draft, baseline, baseline)).toEqual({ agenda: draft, preserved: [] });
    // A line the editor removed on purpose is not brought back, because it was in the baseline.
    expect(reconcileSavedAgenda([draft[0]], baseline, baseline).agenda.map(i => i.title)).toEqual(['Welcome & introductions']);
    // An empty or malformed store adds nothing.
    expect(reconcileSavedAgenda(draft, [], [null, { title: '' }]).agenda).toEqual(draft);
    expect(sameSavedLine({ title: 'A', news_id: 'x' }, { title: 'B', news_id: 'x' })).toBe(true);
    expect(sameSavedLine({ title: 'A', news_id: 'x' }, { title: 'A' })).toBe(false);
  });
});
