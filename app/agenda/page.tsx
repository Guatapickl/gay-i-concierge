"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, Sparkles, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUpcomingEvents, updateEvent } from '@/lib/events';
import type { Event } from '@/types/supabase';
import { Alert, FormInput } from '@/components/ui';

type AgendaItem = {
  id: number;
  text: string;
  duration: number;
  owner: string;
  note: string;
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
    name: 'Paper Club',
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

export default function AgendaMakerPage() {
  const [title, setTitle] = useState('Monthly Meetup');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [items, setItems] = useState<AgendaItem[]>([
    { id: newId(), text: 'Welcome & introductions', duration: 5, owner: '', note: '' },
    { id: newId(), text: 'AI news roundup', duration: 15, owner: '', note: '' },
    { id: newId(), text: 'Open discussion', duration: 15, owner: 'All', note: '' },
    { id: newId(), text: 'Announcements & next steps', duration: 5, owner: '', note: '' },
  ]);
  const [newItemText, setNewItemText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [linkedEventId, setLinkedEventId] = useState<string>('');
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const events = await getUpcomingEvents();
      setUpcomingEvents(events);
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { count } = await supabase
          .from('app_admins')
          .select('user_id', { count: 'exact', head: true })
          .eq('user_id', authData.user.id);
        setIsAdmin(!!count && count > 0);
      }
    })();
  }, []);

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
        }`,
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-z0-9_-]+/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveToEvent = async () => {
    if (!linkedEventId) return;
    setSaving(true);
    setSaveMsg(null);
    const agenda = items
      .filter(i => i.text.trim())
      .map(i => ({
        time: null,
        title: i.text.trim(),
        speaker: i.owner.trim() || null,
        notes: i.note.trim() || null,
      }));
    const ok = await updateEvent(linkedEventId, { agenda });
    setSaving(false);
    setSaveMsg(ok ? 'Saved to event' : 'Failed to save — admin permission may be missing.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 animate-fade-in">
      {/* Editor */}
      <div className="space-y-4">
        {/* Meta */}
        <div className="card p-5 space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field w-full text-lg font-display font-bold tracking-tight"
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
              className="flex-1 min-w-[200px]"
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
            onClick={generateAi}
            disabled={drafting}
            className="ml-auto bg-surface-soft border-[1.5px] border-primary text-primary-muted rounded-full px-3 py-1.5 text-xs font-bold hover:bg-primary-subtle transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {drafting ? 'Drafting…' : 'AI draft'}
          </button>
        </div>

        {draftError && (
          <Alert variant="error" onClose={() => setDraftError(null)}>
            {draftError}
          </Alert>
        )}

        {/* Items */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="card p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-extrabold text-sm text-primary-muted min-w-[20px]">
                  {idx + 1}.
                </span>
                <input
                  value={item.text}
                  onChange={e => update(item.id, 'text', e.target.value)}
                  className="input-field flex-1 font-semibold text-sm"
                  placeholder="Agenda item"
                />
                <input
                  type="number"
                  value={item.duration}
                  onChange={e => update(item.id, 'duration', Number(e.target.value) || 0)}
                  className="input-field w-16 text-center text-sm"
                  min={0}
                />
                <span className="text-[11px] text-foreground-faint">min</span>
                <button
                  onClick={() => move(item.id, -1)}
                  className="px-2 py-1 text-foreground-subtle hover:text-foreground border border-border-subtle rounded transition-colors"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(item.id, 1)}
                  className="px-2 py-1 text-foreground-subtle hover:text-foreground border border-border-subtle rounded transition-colors"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="px-2 py-1 text-primary-muted hover:opacity-70 border border-border-subtle rounded transition-colors"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2 pl-7">
                <input
                  value={item.owner}
                  onChange={e => update(item.id, 'owner', e.target.value)}
                  placeholder="Owner"
                  className="input-field w-28 text-xs"
                />
                <input
                  value={item.note}
                  onChange={e => update(item.id, 'note', e.target.value)}
                  placeholder="Note…"
                  className="input-field flex-1 text-xs"
                />
              </div>
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
            className="input-field flex-1"
          />
          <button
            onClick={add}
            className="bg-surface-soft border-[1.5px] border-primary text-primary-muted font-bold rounded-lg px-4 py-2 text-sm hover:bg-primary-subtle transition-colors"
          >
            + Add
          </button>
        </div>

        {/* Save to event */}
        {isAdmin && upcomingEvents.length > 0 && (
          <div className="card p-4 mt-2">
            <div className="text-xs font-bold text-foreground-faint tracking-[0.1em] mb-2 font-mono">
              SAVE TO EVENT
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={linkedEventId}
                onChange={e => setLinkedEventId(e.target.value)}
                className="input-field flex-1 min-w-[200px] text-sm"
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
              <p className={`text-xs mt-2 ${saveMsg.includes('Failed') ? 'text-danger' : 'text-success'}`}>
                {saveMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      <aside>
        <div className="card-tinted p-5 sticky top-20">
          <div className="font-display font-extrabold text-base text-foreground mb-1">
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
                <div className="w-7 h-7 rounded-full bg-primary-muted text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground leading-tight">
                    {it.text || '—'}
                  </div>
                  <div className="text-[11px] text-foreground-faint mt-0.5">
                    {it.duration} min{it.owner ? ` · ${it.owner}` : ''}
                  </div>
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
