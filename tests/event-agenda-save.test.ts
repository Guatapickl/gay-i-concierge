import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgendaItem } from '@/types/supabase';

// Fake Firestore transaction: the event document can change between the
// moment the maker loaded it and the moment the editor saves.
const fake = vi.hoisted(() => ({
  stored: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  failRead: false,
}));

vi.mock('@/lib/firebase/client', () => ({ db: {}, firebaseAuth: {} }));
vi.mock('firebase/firestore', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: (_db: unknown, name: string, id: string) => ({ name, id }),
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async () => {
          if (fake.failRead) throw new Error('unavailable');
          return { exists: () => fake.stored !== null, data: () => fake.stored ?? undefined };
        },
        update: (_ref: unknown, payload: Record<string, unknown>) => { fake.updates.push(payload); },
      };
      return fn(tx);
    },
  };
});

import { saveEventAgenda } from '@/lib/events';

const line = (title: string, extra: Partial<AgendaItem> = {}): AgendaItem => ({ time: null, title, speaker: null, notes: null, link: null, news_id: null, ...extra });

describe('saveEventAgenda', () => {
  beforeEach(() => { fake.stored = null; fake.updates = []; fake.failRead = false; vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('keeps a line another editor added after the page loaded', async () => {
    const baseline = [line('Welcome & introductions'), line('Feature talk', { time: '7:15 PM' })];
    const draft = [...baseline, line('My story', { link: 'https://example.com/mine', news_id: 'mine' })];
    fake.stored = { title: 'Next meeting', agenda: [...baseline, line('Added by another editor after page load', { notes: 'keep me' })] };
    const result = await saveEventAgenda('ev-1', draft, baseline);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.agenda.map(i => i.title)).toEqual(['Welcome & introductions', 'Feature talk', 'My story', 'Added by another editor after page load']);
    expect(result.preserved.map(i => i.title)).toEqual(['Added by another editor after page load']);
    expect(fake.updates).toHaveLength(1);
    expect((fake.updates[0].agenda as AgendaItem[]).map(i => i.title)).toContain('Added by another editor after page load');
    expect(fake.updates[0].updated_at).toBeTruthy();
  });

  it('writes the draft as is when nothing changed underneath it', async () => {
    const baseline = [line('Welcome & introductions')];
    fake.stored = { agenda: baseline };
    const result = await saveEventAgenda('ev-1', [line('Only mine')], baseline);
    expect(result).toEqual({ ok: true, agenda: [line('Only mine')], preserved: [] });
    expect(fake.updates[0].agenda).toEqual([line('Only mine')]);
  });

  it('reports a missing event or a failed read instead of writing', async () => {
    expect(await saveEventAgenda('gone', [line('x')], [])).toEqual({ ok: false, error: 'This event no longer exists.' });
    fake.stored = { agenda: [] }; fake.failRead = true;
    expect(await saveEventAgenda('ev-1', [line('x')], [])).toEqual({ ok: false, error: 'unavailable' });
    expect(fake.updates).toHaveLength(0);
  });
});
