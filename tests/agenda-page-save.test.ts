import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgendaItem, Event } from '@/types/supabase';
import type { SaveAgendaResult } from '@/lib/events';
import { reconcileSavedAgenda } from '@/lib/agendaArticles';

// Drive the real page callbacks with persistent hook state and a deferred
// database response. No browser, live agenda, or state-slot indices are needed.
// The dispatcher requires unconditional hooks in a stable order. Memo/callback
// dependencies and effect dependencies/cleanup are deliberately ignored: these
// tests prove callback/state sequencing, not memoization or full render cycles.
const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, mounted: false, effects: [] as (() => void)[] }));
const api = vi.hoisted(() => ({ events: [] as Event[], save: vi.fn() }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  const slot = <T,>(initial: () => T) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial();
    return index;
  };
  return {
    ...actual,
    useState: <T,>(initial: T | (() => T)) => {
      const index = slot(() => typeof initial === 'function' ? (initial as () => T)() : initial);
      return [hooks.slots[index], (value: T | ((previous: T) => T)) => {
        hooks.slots[index] = typeof value === 'function' ? (value as (previous: T) => T)(hooks.slots[index] as T) : value;
      }];
    },
    useRef: <T,>(initial: T) => hooks.slots[slot(() => ({ current: initial }))],
    useMemo: <T,>(factory: () => T) => factory(),
    useCallback: <T,>(callback: T) => callback,
    useEffect: (effect: () => void) => { if (!hooks.mounted) hooks.effects.push(effect); },
  };
});
vi.mock('@/lib/firebase/authClient', () => ({ currentUser: async () => ({ uid: 'organizer' }) }));
vi.mock('@/lib/firebase/db', () => ({ getRow: async () => ({}) }));
vi.mock('@/lib/events', () => ({ getUpcomingEvents: async () => api.events, saveEventAgenda: api.save }));
vi.mock('@/lib/agendaSuggestions', () => ({ getSuggestions: async () => [] }));
vi.mock('@/lib/news-discussion-client', () => ({ fetchNewsDiscussion: async () => ({ articles: [], generated_at: 'now' }) }));

import AgendaMakerPage from '@/app/agenda/page';

type Node = ReactElement<Record<string, unknown>>;
function nodes(): Node[] {
  hooks.cursor = 0;
  const result: Node[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object' || !('props' in node)) return;
    const element = node as Node;
    result.push(element);
    walk(element.props.children as ReactNode);
  };
  walk(AgendaMakerPage());
  hooks.mounted = true;
  return result;
}
const find = (predicate: (node: Node) => boolean) => {
  const node = nodes().find(predicate);
  if (!node) throw new Error('Missing page control');
  return node;
};
const select = (id: string) => (find(n => n.type === 'select').props.onChange as (e: unknown) => void)({ target: { value: id } });
const saveButton = () => find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.some(c => c === 'Save agenda' || c === 'Saving…'));
const save = () => (saveButton().props.onClick as () => Promise<void>)();
const titles = () => nodes().filter(n => n.props.placeholder === 'Agenda item').map(n => n.props.value);
const status = () => find(n => n.props.role === 'status').props.children;
const line = (title: string, extra: Partial<AgendaItem> = {}): AgendaItem => ({ title, time: null, speaker: null, notes: null, link: null, news_id: null, ...extra });
const article = line('A-only concurrent article', { news_id: 'x', link: 'https://example.com/x' });
const addArticle = () => (find(n => typeof n.props.onAdd === 'function').props.onAdd as (a: unknown) => void)({
  news_id: 'x', title: article.title, source_url: article.link, count: 1,
});
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function pendingSave() {
  let resolve!: (result: SaveAgendaResult) => void;
  let reject!: (reason: Error) => void;
  api.save.mockImplementationOnce(() => new Promise<SaveAgendaResult>((r, j) => { resolve = r; reject = j; }));
  const completion = save();
  const submitted = api.save.mock.calls.at(-1)![1] as AgendaItem[];
  return { completion, resolve, reject, succeed: () => resolve({ ok: true, agenda: [...submitted, article], preserved: [article] }) };
}

describe('agenda maker pending save completion', () => {
  beforeEach(async () => {
    hooks.slots = []; hooks.cursor = 0; hooks.mounted = false; hooks.effects = [];
    api.save.mockReset();
    api.save.mockImplementation(async (_id: string, draft: AgendaItem[], baseline: AgendaItem[]) => ({ ok: true, ...reconcileSavedAgenda(draft, baseline, baseline) }));
    api.events = ['A', 'B'].map(id => ({ id, title: `Meeting ${id}`, agenda: [line(`${id} original`)], event_datetime: '2026-10-01T19:00:00Z' }) as Event);
    nodes(); hooks.effects.forEach(effect => effect()); await settle();
    select('A');
  });

  it('keeps B draft, baseline and status intact when A finishes, but refreshes A on reopening', async () => {
    const pending = pendingSave();
    expect(saveButton().props.disabled).toBe(true);
    select('B');
    const before = status();
    pending.succeed(); await pending.completion;
    expect(titles()).toEqual(['B original']);
    expect(status()).toBe(before);
    await save();
    const [eventId, draft, baseline] = api.save.mock.calls[1];
    expect(eventId).toBe('B');
    expect(draft.map((i: AgendaItem) => i.title)).toEqual(['B original']);
    expect(baseline).toEqual([line('B original')]);
    select('A');
    expect(titles()).toEqual(['A original', article.title]);
  });

  it.each(['news id', 'canonical URL'])('merges a preserved article by %s without duplicating or losing intervening edits', async identity => {
    const pending = pendingSave();
    addArticle();
    const input = find(n => n.props.placeholder === 'Agenda item' && n.props.value === article.title);
    (input.props.onChange as (e: unknown) => void)({ target: { value: 'My edited title' } });
    const returned = identity === 'news id' ? article : { ...article, news_id: 'different-id', link: 'https://example.com/x/?utm_source=test#fragment' };
    pending.resolve({ ok: true, agenda: [line('A original'), returned], preserved: [returned] });
    await pending.completion;
    expect(titles()).toEqual(['A original', 'My edited title']);
    await save();
    const [, draft, baseline] = api.save.mock.calls[1] as [string, AgendaItem[], AgendaItem[]];
    expect(draft.filter(i => i.news_id === 'x')).toHaveLength(1);
    expect(draft[1]).toMatchObject({ title: 'My edited title', link: article.link });
    expect(reconcileSavedAgenda(draft, baseline, baseline).agenda).toHaveLength(2);
  });

  it('does not attach an old completion to A after switching A to B to A', async () => {
    const pending = pendingSave();
    select('B'); select('A');
    pending.succeed(); await pending.completion;
    expect(titles()).toEqual(['A original']);
    await save();
    expect(api.save.mock.calls[1][2]).toEqual([line('A original')]);
  });

  it('leaves a replacement template untouched by an earlier save', async () => {
    const pending = pendingSave();
    (find(n => n.type === 'button' && n.props.children === 'Workshop').props.onClick as () => void)();
    const replacement = titles();
    pending.succeed(); await pending.completion;
    expect(titles()).toEqual(replacement);
    await save();
    expect(api.save.mock.calls[1][2]).toEqual([line('A original')]);
  });

  it('ignores stale failures and releases the pending state', async () => {
    const pending = pendingSave(); select('B');
    const before = status();
    pending.resolve({ ok: false, error: 'permission denied' }); await pending.completion;
    expect(status()).toBe(before);
    expect(saveButton().props.disabled).toBe(false);
    expect(titles()).toEqual(['B original']);
  });

  it('prevents overlapping saves even before another render', async () => {
    const click = saveButton().props.onClick as () => Promise<void>;
    const pending = pendingSave();
    const second = click();
    expect(api.save).toHaveBeenCalledTimes(1);
    pending.succeed(); await pending.completion; await second;
  });

  it('releases a rejected save and allows retrying with the original draft and baseline', async () => {
    const pending = pendingSave();
    pending.reject(new Error('Connection lost'));
    const error = await pending.completion.catch(reason => reason);
    expect(saveButton().props.disabled).toBe(false);
    expect(error).toBeUndefined();
    expect(status()).toBe('Failed to save: Connection lost');
    expect(titles()).toEqual(['A original']);
    await save();
    expect(api.save).toHaveBeenCalledTimes(2);
    expect(api.save.mock.calls[1]).toEqual(api.save.mock.calls[0]);
    expect(status()).toBe('Saved to event');
  });

  it('releases a stale rejected save without changing the newly selected event status', async () => {
    const pending = pendingSave(); select('B');
    const before = status();
    pending.reject(new Error('Connection lost'));
    const error = await pending.completion.catch(reason => reason);
    expect(saveButton().props.disabled).toBe(false);
    expect(error).toBeUndefined();
    expect(status()).toBe(before);
    expect(titles()).toEqual(['B original']);
  });
});
