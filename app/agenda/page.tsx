"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, Link2, Sparkles, Save } from 'lucide-react';
import { currentUser } from '@/lib/firebase/authClient';
import { getRow } from '@/lib/firebase/db';
import { getUpcomingEvents, saveEventAgenda } from '@/lib/events';
import { getSuggestions } from '@/lib/agendaSuggestions';
import { agendaContainsArticle, appendArticles, articleHost, mergeSavedAgenda, sameSavedLine } from '@/lib/agendaArticles';
import { fetchNewsDiscussion } from '@/lib/news-discussion-client';
import type { DiscussionArticle } from '@/lib/news-discussion-types';
import type { Event, AgendaItem as SavedAgendaItem } from '@/types/supabase';
import { Alert, FormInput } from '@/components/ui';
import VotedArticles, { votesLabel, type VotedArticlesState } from '@/components/VotedArticles';

type AgendaItem = {
  id: number;
  text: string;
  duration: number;
  owner: string;
  note: string;
  /** Source URL when the item came from a voted news story (or a saved agenda link). */
  link?: string;
  /** News item id, kept so "already on this agenda" survives title edits. */
  news_id?: string;
  /** Start time as stored on the event; the maker does not edit it but keeps it. */
  time?: string | null;
  /** Event whose saved agenda this line was loaded from (never written back). */
  from_event?: string;
};

const TEMPLATES: { name: string; items: { text: string; duration: number; owner?: string }[] }[] = [
  {
    name: 'Monthly Meetup',
    items: [
      { text: 'Welcome & introductions', duration: 5 },
      { text: 'AI news roundup', duration: 15 },
      { text: 'Feature presentation', duration: 20 },
      { text: 'Open discussion', duration: 15, owner: 'All' },
      { text: 'Announcements & next steps', duration: 5 },
    ],
  },
  {
    name: 'Research Discussion',
    items: [
      { text: 'Paper summary', duration: 10 },
      { text: 'Key findings discussion', duration: 20 },
      { text: 'Critiques & limitations', duration: 15 },
      { text: 'Real-world implications', duration: 10 },
      { text: 'Next paper vote', duration: 5 },
    ],
  },
  {
    name: 'Workshop',
    items: [
      { text: 'Intro & setup', duration: 10 },
      { text: 'Demo walkthrough', duration: 20 },
      { text: 'Hands-on exercise', duration: 30 },
      { text: 'Share results', duration: 15 },
      { text: 'Wrap-up', duration: 5 },
    ],
  },
];

let nextId = 1;
const newId = () => nextId++;

const DEFAULT_DRAFT = [
  { text: 'Welcome & introductions', duration: 5, owner: '' },
  { text: 'AI news roundup', duration: 15, owner: '' },
  { text: 'Open discussion', duration: 15, owner: 'All' },
  { text: 'Announcements & next steps', duration: 5, owner: '' },
];
const defaultDraft = (): AgendaItem[] => DEFAULT_DRAFT.map(line => ({ id: newId(), note: '', ...line }));
/** True while the draft is still the untouched starting template. */
const isDefaultDraft = (items: AgendaItem[]) =>
  items.length === DEFAULT_DRAFT.length &&
  items.every((item, idx) => item.text === DEFAULT_DRAFT[idx].text && item.owner === DEFAULT_DRAFT[idx].owner && item.duration === DEFAULT_DRAFT[idx].duration && !item.note && !item.link && !item.news_id);

export default function AgendaMakerPage() {
  const [title, setTitle] = useState('Monthly Meetup');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [items, setItems] = useState<AgendaItem[]>(defaultDraft);
  const [newItemText, setNewItemText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [linkedEventId, setLinkedEventId] = useState<string>('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const savePending = useRef(false);
  // A new selection or replacement draft must not receive an older save's
  // baseline, status, or preserved lines, even after switching away and back.
  const draftSession = useRef(0);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // The chosen event's agenda as it was when loaded into the draft; the save
  // compares the stored agenda against it to keep another editor's additions.
  const [loadedAgenda, setLoadedAgenda] = useState<SavedAgendaItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [voted, setVoted] = useState<VotedArticlesState>({ status: 'loading' });
  const [votedRefreshing, setVotedRefreshing] = useState(false);
  const [hideDiscussed, setHideDiscussed] = useState(true);

  // Voted news stories (general "next meeting" pool). A failed load stays an
  // error state; it is never shown as "no votes".
  const loadVoted = useCallback(async (uid: string | null) => {
    if (!uid) { setVoted({ status: 'signed-out' }); return; }
    setVotedRefreshing(true);
    try {
      const list = await fetchNewsDiscussion({ agendas: true });
      setVoted({ status: 'ready', articles: list.articles, generatedAt: list.generated_at });
    } catch (err) {
      setVoted({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setVotedRefreshing(false);
    }
  }, []);

  const fromSaved = (item: SavedAgendaItem, eventId: string): AgendaItem => ({
    id: newId(),
    text: item.title || '',
    duration: 10,
    owner: item.speaker || '',
    note: item.notes || '',
    link: item.link || undefined,
    news_id: item.news_id || undefined,
    time: item.time ?? null,
    from_event: eventId,
  });

  // Choosing an event loads its saved agenda into the draft, exactly as stored,
  // so that "Save agenda" keeps what is already there and adds what you change.
  // Lines that came from the previously chosen event go back to that event,
  // also when the new event has no agenda yet; your own lines stay.
  const selectEvent = (id: string) => {
    if (id === linkedEventId) return;
    draftSession.current++;
    setLinkedEventId(id);
    setSaveMsg(null);
    const event = upcomingEvents.find(e => e.id === id);
    if (!event) { setLoadedAgenda([]); return; }
    const stored = Array.isArray(event.agenda) ? event.agenda : [];
    setLoadedAgenda(stored);
    const merged = mergeSavedAgenda(items, stored, item => fromSaved(item, id), { pristine: isDefaultDraft(items) });
    if (merged.loaded === 0 && merged.dropped === 0) return;
    setItems(merged.items.length > 0 ? merged.items : defaultDraft());
    const plural = (n: number) => (n === 1 ? '' : 's');
    const title = `“${event.title}”`;
    if (merged.loaded === 0) {
      setSaveMsg(
        merged.items.length > 0
          ? `${title} has no saved agenda yet. Kept your ${merged.kept} draft item${plural(merged.kept)}; ${merged.dropped} item${plural(merged.dropped)} loaded from the previous event stay with that event.`
          : `${title} has no saved agenda yet. The ${merged.dropped} item${plural(merged.dropped)} loaded from the previous event stay with that event, so the draft starts from the template.`,
      );
      return;
    }
    setSaveMsg(
      merged.kept > 0
        ? `Loaded ${merged.loaded} saved item${plural(merged.loaded)} from ${title}, followed by ${merged.kept} draft item${plural(merged.kept)} not on it yet. Saving writes all of them to the event.`
        : `Loaded ${merged.loaded} saved item${plural(merged.loaded)} from ${title}. Saving writes this list back to the event.`,
    );
  };

  const placement = (article: DiscussionArticle) => ({
    onDraft: agendaContainsArticle(items, { news_id: article.news_id, source_url: article.source_url }),
  });

  const addArticle = (article: DiscussionArticle) => {
    const result = appendArticles(items, [article], a => ({
      id: newId(),
      text: a.title || a.source_url,
      duration: 10,
      owner: '',
      note: `${votesLabel(a.count)} from the news feed${a.source_name ? ` · ${a.source_name}` : ''}`,
      link: a.source_url,
      news_id: a.news_id,
    }));
    setItems(result.items);
    setSaveMsg(result.added.length > 0 ? `Added “${article.title}” to the agenda.` : `“${article.title}” is already on this agenda.`);
  };

  const importSuggestions = async () => {
    setImporting(true);
    setSaveMsg(null);
    const [forEvent, general] = await Promise.all([
      linkedEventId ? getSuggestions(linkedEventId) : Promise.resolve([]),
      getSuggestions(null),
    ]);
    const pool = [...forEvent, ...general].filter(s => s.status !== 'declined');
    const existing = new Set(items.map(i => i.text.trim().toLowerCase()));
    const fresh = pool.filter(s => !existing.has(s.title.trim().toLowerCase()));
    if (fresh.length === 0) {
      setSaveMsg('No new member suggestions to import.');
    } else {
      setItems(prev => [
        ...prev,
        ...fresh.map(s => ({
          id: newId(),
          text: s.title,
          duration: 10,
          owner: s.author_name || '',
          note: `${s.vote_count || 0} upvote${s.vote_count === 1 ? '' : 's'}${s.notes ? ` — ${s.notes}` : ''}`,
        })),
      ]);
      setSaveMsg(`Imported ${fresh.length} member suggestion${fresh.length === 1 ? '' : 's'}.`);
    }
    setImporting(false);
  };

  useEffect(() => {
    (async () => {
      const events = await getUpcomingEvents();
      setUpcomingEvents(events);
      const user = await currentUser();
      setUserId(user?.uid ?? null);
      if (user) {
        setIsAdmin((await getRow('app_admins', user.uid)) !== null);
      }
      await loadVoted(user?.uid ?? null);
    })();
  }, [loadVoted]);

  const totalMin = useMemo(() => items.reduce((s, i) => s + (Number(i.duration) || 0), 0), [items]);

  const update = (id: number, key: keyof AgendaItem, value: string | number) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [key]: value } : i)));
  const remove = (id: number) => setItems(prev => prev.filter(i => i.id !== id));
  const move = (id: number, dir: -1 | 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx < 0) return prev;
      if (dir === -1 && idx === 0) return prev;
      if (dir === 1 && idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
      return arr;
    });
  };
  const add = () => {
    if (!newItemText.trim()) return;
    setItems(prev => [...prev, { id: newId(), text: newItemText.trim(), duration: 10, owner: '', note: '' }]);
    setNewItemText('');
  };
  const loadTemplate = (t: typeof TEMPLATES[number]) => {
    draftSession.current++;
    setItems(t.items.map(i => ({ id: newId(), text: i.text, duration: i.duration, owner: i.owner || '', note: '' })));
  };

  const generateAi = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch('/api/agenda/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: '',
          startTime: date,
          durationMinutes: Math.max(60, totalMin),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDraftError(data?.error || 'Failed to draft agenda');
        return;
      }
      const aiItems = Array.isArray(data.items) ? data.items : [];
      if (aiItems.length === 0) {
        setDraftError('Model returned an empty agenda. Try a more specific title.');
        return;
      }
      // Convert AI items (which use {time, title, speaker, notes}) to our shape.
      // Pull a duration estimate from the time hint when present.
      draftSession.current++;
      setItems(
        aiItems.map((it: { title: string; speaker?: string; notes?: string }, idx: number) => ({
          id: newId() + idx,
          text: it.title,
          duration: 10,
          owner: it.speaker || '',
          note: it.notes || '',
        })),
      );
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrafting(false);
    }
  };

  const exportTxt = () => {
    const lines = [
      `AGENDA: ${title}`,
      `Date: ${date}${location ? `  |  Location: ${location}` : ''}`,
      `Total: ${totalMin} min`,
      '',
      ...items.map((it, idx) =>
        `${idx + 1}. ${it.text} (${it.duration} min)${it.owner ? ` — ${it.owner}` : ''}${
          it.note ? `\n   Note: ${it.note}` : ''
        }${it.link ? `\n   Link: ${it.link}` : ''}`,
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9_-]+/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Saving runs as a transaction on the event: lines another editor stored
  // since this draft was loaded are kept and shown, never overwritten.
  const saveToEvent = async () => {
    if (!linkedEventId || savePending.current) return;
    const eventId = linkedEventId;
    const session = draftSession.current;
    savePending.current = true;
    setSaving(true);
    setSaveMsg(null);
    let result: Awaited<ReturnType<typeof saveEventAgenda>>;
    try {
      const agenda: SavedAgendaItem[] = items
        .filter(i => i.text.trim())
        .map(i => ({
          time: i.time ?? null,
          title: i.text.trim(),
          speaker: i.owner.trim() || null,
          notes: i.note.trim() || null,
          link: i.link?.trim() || null,
          news_id: i.news_id || null,
        }));
      result = await saveEventAgenda(eventId, agenda, loadedAgenda);
    } catch (error) {
      if (session === draftSession.current) {
        setSaveMsg(`Failed to save: ${error instanceof Error ? error.message : 'Please try again.'}`);
      }
      return;
    } finally {
      savePending.current = false;
      setSaving(false);
    }
    if (result.ok) {
      // The transaction still belongs in the event cache if its draft closed.
      setUpcomingEvents(prev => prev.map(e => (e.id === eventId ? { ...e, agenda: result.agenda } : e)));
      void loadVoted(userId);
    }
    if (session !== draftSession.current) return;
    if (!result.ok) {
      setSaveMsg(`Failed to save: ${result.error || 'admin permission may be missing.'}`);
      return;
    }
    setLoadedAgenda(result.agenda);
    if (result.preserved.length > 0) {
      setItems(prev => {
        // An editor may have added (and edited) the same article while the
        // transaction was pending. Keep their current line by article identity.
        const next = [...prev];
        for (const item of result.preserved) {
          if (!next.some(draft => sameSavedLine({ ...draft, title: draft.text }, item))) {
            next.push(fromSaved(item, eventId));
          }
        }
        return next;
      });
      setSaveMsg(`Saved to event. Kept ${result.preserved.length} item${result.preserved.length === 1 ? '' : 's'} another editor added since you loaded this agenda.`);
    } else {
      setSaveMsg('Saved to event');
    }
  };

  return (
    <div className="min-w-0 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 animate-fade-in"><header className="lg:col-span-2"><p className="eyebrow mb-2">Make room for good conversations</p><h1 className="page-heading">Agenda maker</h1></header>
      {/* Editor */}
      <div className="min-w-0 space-y-4">
        {/* Meta */}
        <div className="card p-5 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field min-w-0 w-full text-lg font-display font-bold tracking-tight"
            placeholder="Meeting title"
          />
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field"
            />
            <FormInput
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Location"
              className="flex-1 min-w-0 w-full"
            />
          </div>
        </div>

        {/* Templates + AI draft */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-foreground-faint mr-1">Template:</span>
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => loadTemplate(t)}
              className="bg-surface-elevated border-[1.5px] border-border-subtle rounded-full px-3 py-1.5 text-xs text-foreground-muted hover:border-border-strong hover:text-foreground transition-colors"
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={importSuggestions}
            disabled={importing}
            className="ml-auto bg-surface-elevated border-[1.5px] border-border-subtle rounded-full px-3 py-1.5 text-xs font-bold text-foreground-muted hover:border-border-strong hover:text-foreground transition-colors disabled:opacity-50"
            title="Pull in topics members have suggested"
          >
            {importing ? 'Importing…' : '↓ Member suggestions'}
          </button>
          <button
            onClick={generateAi}
            disabled={drafting}
            className=" bg-surface-soft border-[1.5px] border-primary text-primary-muted rounded-full px-3 py-1.5 text-xs font-bold hover:bg-primary-subtle transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {drafting ? 'Drafting…' : 'AI draft'}
          </button>
        </div>

        {saveMsg && !(isAdmin && upcomingEvents.length > 0) && (
          <p className="text-xs text-foreground-muted" role="status">{saveMsg}</p>
        )}
        {draftError && (
          <Alert variant="error" onClose={() => setDraftError(null)}>
            {draftError}
          </Alert>
        )}

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="card p-3.5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-semibold text-sm text-primary-muted min-w-[20px]">
                  {idx + 1}.
                </span>
                <input
                  value={item.text}
                  onChange={e => update(item.id, 'text', e.target.value)}
                  className="input-field min-w-0 flex-1 basis-[calc(100%_-_36px)] sm:basis-0 font-semibold text-sm"
                  placeholder="Agenda item"
                />
                <input
                  type="number"
                  value={item.duration}
                  onChange={e => update(item.id, 'duration', Number(e.target.value) || 0)}
                  aria-label="Duration in minutes" className="input-field min-w-0 w-16 min-h-11 text-center text-sm"
                  min={0}
                />
                <span className="text-[11px] text-foreground-faint">min</span>
                <button
                  onClick={() => move(item.id, -1)}
                  className="min-w-11 min-h-11 px-2 py-1 text-foreground-subtle hover:text-foreground border border-border-subtle rounded transition-colors"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(item.id, 1)}
                  className="min-w-11 min-h-11 px-2 py-1 text-foreground-subtle hover:text-foreground border border-border-subtle rounded transition-colors"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="min-w-11 min-h-11 px-2 py-1 text-primary-muted hover:opacity-70 border border-border-subtle rounded transition-colors"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:pl-7">
                <input
                  value={item.owner}
                  onChange={e => update(item.id, 'owner', e.target.value)}
                  placeholder="Owner"
                  className="input-field min-w-0 w-full sm:w-28 text-xs"
                />
                <input
                  value={item.note}
                  onChange={e => update(item.id, 'note', e.target.value)}
                  placeholder="Note…"
                  className="input-field min-w-0 w-full flex-1 text-xs"
                />
              </div>
              {item.link && (
                <p className="text-[11px] text-foreground-muted sm:pl-7 mt-2 break-all">
                  <Link2 className="w-3 h-3 inline mr-1" aria-hidden="true" />
                  Source link kept with this item:{' '}
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{articleHost(item.link) ?? item.link}</a>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Add */}
        <div className="flex gap-2">
          <input
            value={newItemText}
            onChange={e => setNewItemText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder="Add agenda item…"
            className="input-field min-w-0 flex-1"
          />
          <button
            onClick={add}
            className="bg-surface-soft border-[1.5px] border-primary text-primary-muted font-bold rounded-lg px-4 py-2 text-sm hover:bg-primary-subtle transition-colors"
          >
            + Add
          </button>
        </div>

        {/* Voted news stories: explicit picks only, nothing is added on its own */}
        <VotedArticles
          state={voted}
          selectedEventId={linkedEventId || null}
          placement={placement}
          hideDiscussed={hideDiscussed}
          onHideDiscussedChange={setHideDiscussed}
          onAdd={addArticle}
          onRefresh={() => void loadVoted(userId)}
          refreshing={votedRefreshing}
        />

        {/* Save to event */}
        {isAdmin && upcomingEvents.length > 0 && (
          <div className="card p-4 mt-2">
            <div className="text-xs font-bold text-foreground-faint tracking-[0.1em] mb-2 font-mono">
              SAVE TO EVENT
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={linkedEventId}
                onChange={e => selectEvent(e.target.value)}
                aria-label="Event to save this agenda to"
                className="input-field flex-1 min-w-0 w-full text-sm"
              >
                <option value="">— Choose event —</option>
                {upcomingEvents.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {new Date(e.event_datetime).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <button
                onClick={saveToEvent}
                disabled={!linkedEventId || saving}
                className="btn-brand inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save agenda'}
              </button>
            </div>
            {saveMsg && (
              <p role="status" className={`text-xs mt-2 ${saveMsg.includes('Failed') ? 'text-danger' : 'text-success'}`}>
                {saveMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <aside className="min-w-0">
        <div className="card p-5 sticky top-20">
          <div className="font-display font-semibold text-base text-foreground mb-1">
            {title || 'Untitled meeting'}
          </div>
          <div className="text-[11px] text-foreground-subtle mb-1 font-mono">
            {date}{location ? ` · ${location}` : ''}
          </div>
          <div className="text-[11px] font-bold text-primary-muted mb-4 font-mono tracking-wider">
            TOTAL: {totalMin} MIN
          </div>
          {items.length === 0 ? (
            <p className="text-foreground-faint text-sm">No items yet — start building.</p>
          ) : (
            items.map((it, idx) => (
              <div key={it.id} className="flex items-start gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-full bg-primary-muted text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground leading-tight">
                    {it.text || '—'}
                  </div>
                  <div className="text-[11px] text-foreground-faint mt-0.5">
                    {it.duration} min{it.owner ? ` · ${it.owner}` : ''}
                  </div>
                  {it.link && (
                    <a href={it.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5 break-all">
                      <Link2 className="w-3 h-3 shrink-0" aria-hidden="true" />{articleHost(it.link) ?? it.link}
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
          <button
            onClick={exportTxt}
            className="btn-brand w-full mt-4 inline-flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export agenda
          </button>
          <Link
            href="/events"
            className="block mt-3 text-[11px] text-center text-foreground-subtle hover:text-foreground transition-colors font-mono tracking-wide"
          >
            <FileText className="w-3 h-3 inline mr-1" />
            VIEW ALL EVENTS
          </Link>
        </div>
      </aside>
    </div>
  );
}
