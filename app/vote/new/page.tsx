"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { createPoll } from '@/lib/polls';
import { isCurrentUserAdmin } from '@/lib/isAdmin';
import { Button, FormInput, FormTextarea, Alert, LoadingSpinner } from '@/components/ui';

type Row = { date: string; time: string };

export default function NewPollPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [title, setTitle] = useState('Next meeting: which dates work?');
  const [description, setDescription] = useState('Rank the dates from best to worst. We will book the top pick.');
  const [closesAt, setClosesAt] = useState('');
  const [defaultTime, setDefaultTime] = useState('19:00');
  const [rows, setRows] = useState<Row[]>([{ date: '', time: '' }, { date: '', time: '' }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const admin = await isCurrentUserAdmin();
      if (!admin) {
        router.replace('/vote');
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const dts = rows
      .filter(r => r.date)
      .map(r => new Date(`${r.date}T${r.time || defaultTime}:00`))
      .filter(d => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
      .map(d => d.toISOString());
    if (dts.length < 2) {
      setMessage('Add at least two candidate dates.');
      return;
    }
    setSaving(true);
    const id = await createPoll({
      title: title.trim(),
      description: description.trim() || null,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      optionDatetimes: dts,
    });
    setSaving(false);
    if (!id) {
      setMessage('Could not create the poll. Are you an admin and is the Supabase migration applied?');
      return;
    }
    router.push(`/vote/${id}`);
  };

  if (checking) return <LoadingSpinner text="Checking permissions…" className="mt-8" />;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground">New date poll</h1>
      <form onSubmit={submit} className="space-y-5">
        <div className="card p-5 space-y-3">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <FormInput value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Message to members</label>
            <FormTextarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Default meeting time</label>
              <input type="time" className="input-field w-full" value={defaultTime} onChange={e => setDefaultTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Voting closes (optional)</label>
              <input type="date" className="input-field w-full" value={closesAt} onChange={e => setClosesAt(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono">CANDIDATE DATES</div>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="date" className="input-field flex-1" value={r.date} onChange={e => setRow(i, { date: e.target.value })} />
              <input type="time" className="input-field w-32" value={r.time} placeholder={defaultTime} onChange={e => setRow(i, { time: e.target.value })} />
              <button
                type="button"
                onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                className="p-2 text-foreground-subtle hover:text-danger transition-colors"
                aria-label="Remove date"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows(prev => [...prev, { date: '', time: '' }])}
            className="inline-flex items-center gap-1.5 text-sm text-primary-muted hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" /> Add another date
          </button>
          <p className="text-xs text-foreground-faint">Leave the time blank to use the default meeting time.</p>
        </div>

        {message && <Alert variant="error" onClose={() => setMessage(null)}>{message}</Alert>}

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create poll'}
        </Button>
      </form>
    </div>
  );
}
