import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { robots } from '@/app/robot/registry';
import '@/app/globals.css';

function Preview() {
  const [light, setLight] = useState(false);
  const [detail, setDetail] = useState(false);
  const original = robots.find(robot => robot.id === 'gpt-6-open-seat')!;
  const entries = [...robots, { ...original, id: 'open-seat-second-instance', name: 'The Open Seat · second instance' }];
  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6" data-preview-layout={detail ? 'detail' : 'gallery'}>
      <style>{`
        [data-preview-layout="detail"] .preview-gallery { display: block; max-width: 800px; margin: auto; }
        [data-preview-layout="detail"] article:not(:first-child) { display: none; }
      `}</style>
      <header className="space-y-3">
        <p className="eyebrow">Flagship Showcase / local review</p>
        <h1 className="page-heading">The Open Seat</h1>
        <p className="text-sm text-foreground-muted">A brass automaton makes room by becoming a bench. GPT-6 · Codex desktop; exact model snapshot unknown.</p>
        <div className="flex flex-wrap gap-3">
          <button className="theme-toggle" aria-pressed={light} onClick={() => {
            document.documentElement.dataset.theme = light ? 'dark' : 'light';
            setLight(!light);
          }}>Light theme</button>
          <button className="theme-toggle" aria-pressed={detail} onClick={() => setDetail(!detail)}>Enlarge artwork</button>
        </div>
        <p className="text-xs text-foreground-muted">Actual registered artworks and shared CSS. Gallery padding and 85% wrapper match /robot. Voting is omitted in this local preview.</p>
      </header>
      <div className="preview-gallery grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {entries.map(robot => {
          const Artwork = robot.component;
          return (
            <article key={robot.id} className="card min-w-0 overflow-hidden flex flex-col" aria-label={robot.name}>
              <header className="p-4 bg-surface-elevated/70 border-b border-border space-y-1">
                <h2 className="font-display font-bold text-foreground">{robot.name}</h2>
                <p className="text-xs font-mono text-foreground-muted">{robot.model}</p>
                <p className="text-[11px] text-foreground-faint">Added <time dateTime={robot.addedAt}>{new Date(robot.addedAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</time></p>
              </header>
              <div className="aspect-square flex items-center justify-center p-8 bg-surface-elevated border-b border-border overflow-hidden">
                <div className="w-[85%] h-[85%] flex items-center justify-center"><Artwork className="w-full h-full max-h-full" /></div>
              </div>
              <footer className="p-4 text-sm text-foreground-muted">{robot.id.includes('open-seat') ? 'Intelligence as hospitality. Stay a while.' : 'Existing showcase entry'}</footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
