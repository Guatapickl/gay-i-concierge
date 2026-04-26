"use client";

import { Repeat } from 'lucide-react';
import type { RecurrenceConfig, RecurrenceFrequency } from '@/types/supabase';
import { describeRecurrence, buildRecurrenceRule } from '@/lib/recurrence';

type Props = {
  value: RecurrenceConfig;
  onChange: (next: RecurrenceConfig) => void;
  baseDateTime?: string;
};

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every other week' },
  { value: 'monthly', label: 'Monthly' },
];

export default function RecurrencePicker({ value, onChange, baseDateTime }: Props) {
  const baseDate = baseDateTime ? new Date(baseDateTime) : null;
  const previewRule =
    baseDate && !isNaN(baseDate.getTime())
      ? buildRecurrenceRule(value.frequency, baseDate)
      : null;
  const preview = describeRecurrence(previewRule);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-foreground-subtle" />
        <label className="text-sm font-medium text-foreground">Repeats</label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {FREQUENCY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ ...value, frequency: opt.value })}
            className={`px-3 py-2 text-sm rounded-lg border transition-all ${
              value.frequency === opt.value
                ? 'bg-primary text-background border-primary'
                : 'bg-surface border-border text-foreground-muted hover:text-foreground hover:border-foreground-subtle'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value.frequency !== 'none' && (
        <div className="flex items-center gap-3 pt-1">
          <label className="text-sm text-foreground-muted whitespace-nowrap">
            Number of occurrences
          </label>
          <input
            type="number"
            min={2}
            max={52}
            value={value.count}
            onChange={e =>
              onChange({ ...value, count: Math.max(2, Math.min(52, Number(e.target.value) || 2)) })
            }
            className="w-24 px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm focus:border-primary focus:outline-none"
          />
          {preview && (
            <span className="text-sm text-foreground-subtle">
              · {preview}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
