import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { robots } from '@/app/robot/registry';
import { sortRobotShowcase } from '@/lib/robot-showcase';
import '@/app/globals.css';

type Layout = 'gallery' | 'detail' | 'solo';
const params = new URLSearchParams(window.location.search);
const TARGET_ID = 'praxis-council-afterimage';
const initialLayout = (['gallery', 'detail', 'solo'].includes(params.get('layout') ?? '') ? params.get('layout') : 'gallery') as Layout;

function Preview() {
  const [light, setLight] = useState(document.documentElement.dataset.theme === 'light');
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const ordered = sortRobotShowcase(robots, 'newest');
  const target = ordered.find(robot => robot.id === TARGET_ID) ?? ordered[0];
  const entries = [target, ...ordered.filter(robot => robot.id !== target.id), { ...target, id: `${target.id}-second-instance`, name: `${target.name} · second instance` }];
  useEffect(() => {
    if (params.get('pin') !== '1') return undefined;
    const timer = window.setTimeout(() => {
      document.querySelector<SVGSVGElement>('article svg')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6" data-preview-layout={layout}>
      <style>{`
        [data-preview-layout="detail"] .preview-gallery { display: block; max-width: 800px; margin: auto; }
        [data-preview-layout="detail"] article:not(:first-child) { display: none; }
        [data-preview-layout="solo"] .preview-gallery { display: block; max-width: 900px; margin: auto; }
        [data-preview-layout="solo"] article:not(:first-child) { display: none; }
        [data-preview-layout="solo"] article header, [data-preview-layout="solo"] article footer { display: none; }
      `}</style>
      <header className="space-y-3" data-preview-header>
        <p className="eyebrow">Flagship Showcase / local review</p>
        <h1 className="page-heading">{target.name}</h1>
        <p className="text-sm text-foreground-muted">{target.model} · shown first with every other artwork and a second instance of itself.</p>
        <div className="flex flex-wrap gap-3">
          <button className="theme-toggle" aria-pressed={light} onClick={() => {
            document.documentElement.dataset.theme = light ? 'dark' : 'light';
            setLight(!light);
          }}>Light theme</button>
          <button className="theme-toggle" aria-pressed={layout === 'detail'} onClick={() => setLayout(layout === 'detail' ? 'gallery' : 'detail')}>Enlarge artwork</button>
          <button className="theme-toggle" aria-pressed={layout === 'solo'} onClick={() => setLayout(layout === 'solo' ? 'gallery' : 'solo')}>Artwork only</button>
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
              <footer className="p-4 text-sm text-foreground-muted">{robot.id.startsWith(target.id) ? 'Entry under review' : 'Existing showcase entry'}</footer>
            </article>
          );
        })}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
