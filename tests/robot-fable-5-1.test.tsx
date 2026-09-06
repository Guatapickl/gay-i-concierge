import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Fable51Robot from '@/components/robots/Fable51Robot';
import { robots } from '@/app/robot/registry';
import { ROBOT_SHOWCASE } from '@/lib/robot-showcase';

const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
const references = (html: string) => [
  ...[...html.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1]),
  ...[...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)].map(match => match[1]),
];

describe('Kin (Claude Fable 5.1)', () => {
  it('registers a stable entry mapped to the artwork component', () => {
    const entry = ROBOT_SHOWCASE.find(robot => robot.id === 'claude-fable-5-1');
    expect(entry).toMatchObject({ name: 'Kin', model: 'Claude Fable 5.1' });
    expect(Number.isNaN(Date.parse(entry!.addedAt))).toBe(false);
    expect(robots.find(robot => robot.id === 'claude-fable-5-1')?.component).toBe(Fable51Robot);
    expect(new Set(ROBOT_SHOWCASE.map(robot => robot.id)).size).toBe(ROBOT_SHOWCASE.length);
  });

  it('renders an accessible, self-contained SVG whose internal references resolve', () => {
    const html = renderToStaticMarkup(<Fable51Robot className="w-full h-full max-h-full" />);
    expect(html.startsWith('<svg')).toBe(true);
    expect(html).toContain('class="kin-');
    expect(html).toContain('w-full h-full max-h-full');
    expect(html).toContain('<title id="kin-');
    expect(html).toContain('<desc id="kin-');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('prefers-reduced-motion');
    expect(html).not.toMatch(/(?:href|src)="https?:|url\(["']?https?:/);
    const defined = new Set(ids(html));
    for (const reference of references(html)) expect(defined.has(reference), `#${reference} is defined`).toBe(true);
    for (const id of defined) expect(id).toMatch(/^kin-[A-Za-z0-9]+-[a-z0-9-]+$/);
  });

  it('keeps IDs, classes and keyframes unique across two instances on one page', () => {
    const html = renderToStaticMarkup(<div><Fable51Robot /><Fable51Robot /></div>);
    const all = ids(html);
    expect(new Set(all).size).toBe(all.length);
    const keyframes = [...html.matchAll(/@keyframes ([\w-]+)/g)].map(match => match[1]);
    expect(new Set(keyframes).size).toBe(keyframes.length);
    const roots = [...html.matchAll(/<svg [^>]*class="(kin-[A-Za-z0-9]+)/g)].map(match => match[1]);
    expect(roots).toHaveLength(2);
    expect(roots[0]).not.toBe(roots[1]);
  });
});
