import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PraxisCouncilRobot from '@/components/robots/PraxisCouncilRobot';
import { robots } from '@/app/robot/registry';
import { ROBOT_SHOWCASE } from '@/lib/robot-showcase';

const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
const references = (html: string) => [
  ...[...html.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1]),
  ...[...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)].map(match => match[1]),
];

describe('Afterimage (Praxis · Cooperative Council · 2026-09-09)', () => {
  it('registers a stable entry mapped to the artwork component', () => {
    const entry = ROBOT_SHOWCASE.find(robot => robot.id === 'praxis-council-afterimage');
    expect(entry).toMatchObject({ name: 'Afterimage', model: 'Praxis · Cooperative Council · 2026-09-09' });
    expect(Number.isNaN(Date.parse(entry!.addedAt))).toBe(false);
    expect(robots.find(robot => robot.id === 'praxis-council-afterimage')?.component).toBe(PraxisCouncilRobot);
    expect(new Set(ROBOT_SHOWCASE.map(robot => robot.id)).size).toBe(ROBOT_SHOWCASE.length);
    expect(robots.every(robot => typeof robot.component === 'function')).toBe(true);
  });

  it('renders a self-contained square SVG whose internal references resolve', () => {
    const html = renderToStaticMarkup(<PraxisCouncilRobot className="w-full h-full max-h-full" />);
    expect(html.startsWith('<svg')).toBe(true);
    expect(html).toContain('viewBox="0 0 800 800"');
    expect(html).toContain('class="afterimage-');
    expect(html).toContain('w-full h-full max-h-full');
    expect(html).toContain('<title id="afterimage-');
    expect(html).toContain('Afterimage, the Night Architect');
    expect(html).toContain('role="img"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('[data-theme="light"]');
    expect(html).not.toMatch(/(?:href|src)="https?:|url\(["']?https?:/);
    const defined = new Set(ids(html));
    for (const reference of references(html)) expect(defined.has(reference), `#${reference} is defined`).toBe(true);
    for (const id of defined) expect(id).toMatch(/^afterimage-[A-Za-z0-9]+-[a-z-]+$/);
  });

  it('scopes IDs, classes and keyframes so two instances can share a page', () => {
    const html = renderToStaticMarkup(<div><PraxisCouncilRobot /><PraxisCouncilRobot /></div>);
    const all = ids(html);
    expect(new Set(all).size).toBe(all.length);
    const keyframes = [...html.matchAll(/@keyframes ([\w-]+)/g)].map(match => match[1]);
    expect(keyframes.length).toBeGreaterThan(0);
    expect(new Set(keyframes).size).toBe(keyframes.length);
    const roots = [...html.matchAll(/<svg [^>]*class="(afterimage-[A-Za-z0-9]+)/g)].map(match => match[1]);
    expect(roots).toHaveLength(2);
    expect(roots[0]).not.toBe(roots[1]);
    for (const root of roots) expect(html).toContain(`@keyframes ${root}-spin`);
  });

  it('renders deterministically for the same tree', () => {
    const first = renderToStaticMarkup(<PraxisCouncilRobot />);
    const second = renderToStaticMarkup(<PraxisCouncilRobot />);
    expect(second).toBe(first);
  });
});
