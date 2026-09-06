"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { currentUser } from '@/lib/firebase/authClient';
import { getRow, listRows, toTs } from '@/lib/firebase/db';
import { orderBy, where } from 'firebase/firestore';
import type { Event } from '@/types/supabase';
import { describeRecurrence } from '@/lib/recurrence';
import { LoadingSpinner } from '@/components/ui';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Map recurring color hint → consistent visual marker per series.
const SERIES_PALETTE = ['#087F75', '#13796F', '#327E78', '#347D72', '#56756F', '#087F75', '#13796F'];

function colorForEvent(event: Event, seriesIndex: Map<string, number>) {
  if (event.series_id) {
    const idx = seriesIndex.get(event.series_id) ?? 0;
    return SERIES_PALETTE[idx % SERIES_PALETTE.length];
  }
  // One-offs cycle through later colors for visual variety
  return SERIES_PALETTE[(event.id.charCodeAt(0) ?? 0) % SERIES_PALETTE.length];
}

export default function CalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selected, setSelected] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      // Pull the current visible month plus 60 days of upcoming for the sidebar
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 2, 1).toISOString();
      const data = await listRows<Event>(
        'events',
        where('event_datetime', '>=', toTs(start)),
        where('event_datetime', '<', toTs(end)),
        orderBy('event_datetime', 'asc'),
      );
      setEvents(data);

      const user = await currentUser();
      if (user) {
        setIsAdmin((await getRow('app_admins', user.uid)) !== null);
      }
      setLoading(false);
    })();
  }, [month, year]);

  const seriesIndex = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach(e => {
      if (e.series_id && !map.has(e.series_id)) {
        map.set(e.series_id, map.size);
      }
    });
    return map;
  }, [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, Event[]>();
    for (const e of events) {
      const d = new Date(e.event_datetime);
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      const day = d.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return map;
  }, [events, month, year]);

  // Build the grid cells (lead-in blanks + days + tail blanks)
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  // Sidebar: selected day's events, or all visible-month upcoming
  const now = Date.now();
  const sidebarEvents = selected
    ? events.filter(e => {
        const d = new Date(e.event_datetime);
        return d.getDate() === selected && d.getMonth() === month && d.getFullYear() === year;
      })
    : events.filter(e => new Date(e.event_datetime).getTime() >= now);

  if (loading) return <LoadingSpinner text="Loading calendar..." className="py-12" />;

  return (
    <div className="space-y-8 animate-fade-in">
      <header><p className="eyebrow mb-2">Meet, learn, connect</p><h1 className="page-heading">Meeting calendar</h1></header>
      {/* Calendar grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={goPrevMonth}
            className="w-11 h-11 rounded-lg bg-surface-elevated border border-border-subtle text-primary flex items-center justify-center hover:border-border-strong transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="section-heading">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={goNextMonth}
            className="w-11 h-11 rounded-lg bg-surface-elevated border border-border-subtle text-primary flex items-center justify-center hover:border-border-strong transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES.map(d => (
            <div
              key={d}
              className="text-center text-[11px] font-bold text-foreground-faint tracking-[0.08em] py-1 font-mono"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-px border border-border bg-border rounded-lg overflow-hidden">
          {cells.map((day, i) => {
            const dayEvents = day ? eventsByDay.get(day) || [] : [];
            const sel = day === selected;
            const t = day ? isToday(day) : false;
            if (!day) return <div key={i} aria-hidden="true" className="min-h-[80px] md:min-h-[120px] bg-surface-elevated" />;
            return (
              <button
                key={i}
                onClick={() => day && setSelected(sel ? null : day)}
                aria-label={`${new Date(year, month, day).toLocaleDateString(undefined, { dateStyle: 'full' })}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
                aria-pressed={sel}
                className={`min-h-[80px] md:min-h-[120px] p-2 text-left transition-all ${
                  !day
                    ? 'bg-surface-elevated cursor-default'
                    : sel
                      ? 'bg-surface-soft border-[1.5px] border-primary'
                      : t
                        ? 'bg-surface-soft ring-1 ring-inset ring-primary'
                        : 'bg-surface border-[1.5px] border-border hover:border-border-strong'
                }`}
              >
                {day && (
                  <>
                    <div
                      className={`text-xs text-right ${
                        t ? 'font-semibold text-primary' : 'font-medium text-foreground'
                      }`}
                    >
                      {day}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div
                          key={e.id}
                          className="rounded-sm bg-surface-soft text-primary text-[10px] p-1 truncate"
                          title={e.title}
                        >
                          <span className="hidden sm:block truncate">{e.title}</span><span className="block">{new Date(e.event_datetime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-center text-foreground-subtle">
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-6 flex justify-end">
            <Link href="/events/new" className="btn-brand inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New event
            </Link>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside>
        <div className="text-[13px] font-bold text-foreground-faint tracking-[0.1em] mb-3 font-mono">
          {selected
            ? `${MONTH_NAMES[month].toUpperCase()} ${selected} EVENTS`
            : 'UPCOMING EVENTS'}
        </div>
        <div className="space-y-3">
          {sidebarEvents.length === 0 ? (
            <p className="text-foreground-faint text-sm py-3">
              {selected ? 'No events on this day.' : 'No upcoming events.'}
            </p>
          ) : (
            sidebarEvents.slice(0, 12).map(e => {
              const d = new Date(e.event_datetime);
              const time = d.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              });
              const recurrence = describeRecurrence(e.recurrence_rule);
              return (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="card flex flex-wrap items-center justify-between gap-4 p-5 hover:border-border-strong transition-colors"
                  style={{
                    border: '1.5px solid var(--color-border)',
                    borderLeftWidth: 4,
                    borderLeftColor: colorForEvent(e, seriesIndex),

                  }}
                >
                  <div className="flex gap-4 items-center"><div className="text-center min-w-12"><span className="eyebrow block">{d.toLocaleDateString(undefined, { month: 'short' })}</span><span className="text-2xl font-display">{d.getDate()}</span></div><div className="font-semibold text-base text-foreground">
                    {e.title}
                  </div></div>
                  <div className="text-xs text-foreground-subtle">
                    {time}
                    {e.location ? ` · ${e.location}` : ''}
                  </div>
                  {recurrence && (
                    <div className="text-[10px] text-foreground-faint mt-1 font-mono uppercase tracking-wide">
                      {recurrence}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
