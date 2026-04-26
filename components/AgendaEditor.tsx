"use client";

import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2, Sparkles, Clock, User, FileText } from 'lucide-react';
import type { AgendaItem } from '@/types/supabase';
import { Button, FormInput, FormTextarea, Alert } from '@/components/ui';

type Props = {
  value: AgendaItem[];
  onChange: (items: AgendaItem[]) => void;
  /** Pass to enable AI-assist; the model uses these for context. */
  meetingContext?: {
    title?: string;
    description?: string;
    startTime?: string;
  };
};

export default function AgendaEditor({ value, onChange, meetingContext }: Props) {
  const [draft, setDraft] = useState<AgendaItem[]>(value || []);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const commit = (items: AgendaItem[]) => {
    setDraft(items);
    onChange(items);
  };

  const generateDraft = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch('/api/agenda/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingContext?.title || '',
          description: meetingContext?.description || '',
          startTime: meetingContext?.startTime || '',
          durationMinutes: 90,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDraftError(data?.error || 'Failed to draft agenda');
        return;
      }
      const items: AgendaItem[] = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 0) {
        setDraftError('Model returned an empty agenda. Try adding a description.');
        return;
      }
      // Append to any existing items rather than replacing
      commit([...draft, ...items]);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-foreground-subtle" />
          Agenda
        </label>
        <div className="flex items-center gap-2">
          {meetingContext && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={drafting}
              onClick={generateDraft}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {drafting ? 'Drafting…' : 'AI draft'}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => commit([...draft, { time: '', title: '', speaker: '', notes: '' }])}
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </Button>
        </div>
      </div>

      {draftError && (
        <Alert variant="error" onClose={() => setDraftError(null)}>
          {draftError}
        </Alert>
      )}

      {draft.length === 0 && (
        <p className="text-sm text-foreground-subtle py-3 px-4 bg-surface border border-dashed border-border rounded-lg">
          No agenda items yet. Click <strong>Add item</strong> to build one manually
          {meetingContext ? ' or use AI draft' : ''}.
        </p>
      )}

      <div className="space-y-3">
        {draft.map((item, idx) => (
          <div key={idx} className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_180px] gap-3">
              <div>
                <label className="block text-xs text-foreground-subtle mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time
                </label>
                <FormInput
                  type="text"
                  placeholder="6:00 PM"
                  value={item.time || ''}
                  onChange={e => {
                    const items = [...draft];
                    items[idx] = { ...items[idx], time: e.target.value };
                    commit(items);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Title</label>
                <FormInput
                  type="text"
                  placeholder="Welcome &amp; introductions"
                  value={item.title || ''}
                  onChange={e => {
                    const items = [...draft];
                    items[idx] = { ...items[idx], title: e.target.value };
                    commit(items);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Speaker
                </label>
                <FormInput
                  type="text"
                  placeholder="Optional"
                  value={item.speaker || ''}
                  onChange={e => {
                    const items = [...draft];
                    items[idx] = { ...items[idx], speaker: e.target.value };
                    commit(items);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-foreground-subtle mb-1">Notes</label>
              <FormTextarea
                rows={2}
                placeholder="Optional details for this item"
                value={item.notes || ''}
                onChange={e => {
                  const items = [...draft];
                  items[idx] = { ...items[idx], notes: e.target.value };
                  commit(items);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => {
                  const items = [...draft];
                  [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                  commit(items);
                }}
                className="p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={idx === draft.length - 1}
                onClick={() => {
                  const items = [...draft];
                  [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
                  commit(items);
                }}
                className="p-1.5 text-foreground-subtle hover:text-foreground hover:bg-surface-hover rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Move down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => commit(draft.filter((_, i) => i !== idx))}
                className="ml-auto p-1.5 text-foreground-subtle hover:text-danger hover:bg-surface-hover rounded-md transition-colors"
                aria-label="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
