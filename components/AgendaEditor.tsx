"use client";

import { useState } from 'react';
import type { AgendaItem } from '@/types/supabase';

type Props = {
  value: AgendaItem[];
  onChange: (items: AgendaItem[]) => void;
};

export default function AgendaEditor({ value, onChange }: Props) {
  const [draft, setDraft] = useState<AgendaItem[]>(value || []);

  const commit = (items: AgendaItem[]) => {
    setDraft(items);
    onChange(items);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-medium">Agenda</label>
        <button
          type="button"
          className="text-sm px-3 py-1 bg-gray-200 rounded"
          onClick={() => commit([...draft, { time: '', title: '', speaker: '', notes: '' }])}
        >
          + Add Item
        </button>
      </div>

      {draft.length === 0 && (
        <p className="text-sm text-gray-500">No agenda items. Use + Add Item to create one.</p>
      )}

      {draft.map((item, idx) => (
        <div key={idx} className="border rounded p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-700">Time</label>
              <input
                type="text"
                className="w-full border px-3 py-2"
                placeholder="e.g., 6:00 PM"
                value={item.time || ''}
                onChange={e => {
                  const items = [...draft];
                  items[idx] = { ...items[idx], time: e.target.value };
                  commit(items);
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Title</label>
              <input
                type="text"
                className="w-full border px-3 py-2"
                placeholder="Agenda item title"
                value={item.title || ''}
                onChange={e => {
                  const items = [...draft];
                  items[idx] = { ...items[idx], title: e.target.value };
                  commit(items);
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Speaker</label>
              <input
                type="text"
                className="w-full border px-3 py-2"
                placeholder="Optional speaker"
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
            <label className="block text-sm text-gray-700">Notes</label>
            <textarea
              className="w-full border px-3 py-2"
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

          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm px-2 py-1 bg-gray-100 rounded"
                disabled={idx === 0}
                onClick={() => {
                  if (idx === 0) return;
                  const items = [...draft];
                  const [a, b] = [items[idx - 1], items[idx]];
                  items[idx - 1] = b;
                  items[idx] = a;
                  commit(items);
                }}
              >
                ↑ Move Up
              </button>
              <button
                type="button"
                className="text-sm px-2 py-1 bg-gray-100 rounded"
                disabled={idx === draft.length - 1}
                onClick={() => {
                  if (idx === draft.length - 1) return;
                  const items = [...draft];
                  const [a, b] = [items[idx], items[idx + 1]];
                  items[idx] = b;
                  items[idx + 1] = a;
                  commit(items);
                }}
              >
                ↓ Move Down
              </button>
            </div>
            <button
              type="button"
              className="text-sm px-2 py-1 bg-red-100 text-red-700 rounded"
              onClick={() => {
                const items = draft.filter((_, i) => i !== idx);
                commit(items);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
