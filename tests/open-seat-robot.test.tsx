import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { robots } from '@/app/robot/registry';

const entry = robots.find(robot => robot.id === 'gpt-6-open-seat');

function renderEntry(twice = false) {
  expect(entry, 'The Open Seat must be registered in the showcase').toBeDefined();
  const Artwork = entry!.component;
  return renderToStaticMarkup(<>
    <Artwork className="w-full h-full max-h-full" />
    {twice && <Artwork />}
  </>);
}

describe('The Open Seat', () => {
  it('registers a dated entry with an artwork and accurate model family', () => {
    expect(entry).toMatchObject({ name: 'The Open Seat', model: 'GPT-6 · Codex' });
    expect(Number.isFinite(Date.parse(entry!.addedAt))).toBe(true);
    expect(typeof entry!.component).toBe('function');
  });

  it('provides a responsive SVG with a resolvable accessible name and description', () => {
    const html = renderEntry();
    expect(html).toMatch(/<svg[^>]+viewBox="0 0 640 640"/);
    expect(html).toContain('class="w-full h-full max-h-full"');
    expect(html).toContain('role="img"');
    const label = html.match(/aria-labelledby="([^"]+)"/)![1];
    const description = html.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toContain(`<title id="${label}">The Open Seat`);
    expect(html).toContain(`<desc id="${description}">`);
  });

  it('keeps IDs unique and every resource reference inside its own SVG', () => {
    const html = renderEntry(true);
    const allIds = Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]);
    expect(new Set(allIds).size).toBe(allIds.length);
    const svgs = html.match(/<svg\b[\s\S]*?<\/svg>/g)!;
    expect(svgs).toHaveLength(2);
    for (const svg of svgs) {
      const ids = new Set(Array.from(svg.matchAll(/\bid="([^"]+)"/g), match => match[1]));
      const refs = Array.from(svg.matchAll(/url\(#([^)]*)\)/g), match => match[1]);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) expect(ids.has(ref), `Unresolved SVG resource: ${ref}`).toBe(true);
    }
  });
});
