import { describe, expect, it, vi } from 'vitest';
import { canonicalNewsUrl, normalizeNewsItem, parseRss, collectNews, hasSecret } from '@/lib/news-ingestion';

const source = { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', hosts: ['openai.com'], tag: 'Industry' };
const xml = '<rss><channel><item><title><![CDATA[AI &amp; research]]></title><link>https://openai.com/index/test/?utm_source=rss</link><description><![CDATA[<p>A new &amp; useful model.</p>]]></description><pubDate>Sat, 05 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>';

describe('news ingestion', () => {
  it('canonicalizes tracking variants and rejects executable or credentialed URLs', () => {
    expect(canonicalNewsUrl('https://openai.com/index/test/?utm_source=x#top')).toBe('https://openai.com/index/test');
    expect(canonicalNewsUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalNewsUrl('https://user:password@example.com/a')).toBeNull();
    expect(normalizeNewsItem({ title: 42, summary: 'text', source_url: 'https://example.com/a' })).toBeNull();
  });
  it('extracts plain publisher text and source links while rejecting off-domain stories', () => {
    const parsed = parseRss(xml, source);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ title: 'AI & research', summary: 'A new & useful model.', source_url: 'https://openai.com/index/test', source_name: 'OpenAI', published_at: '2026-09-05T12:00:00.000Z' });
    expect(parseRss(xml.replace('https://openai.com/index/', 'https://evil.example/index/'), source)).toEqual([]);
  });
  it('strips entity-encoded publisher HTML after decoding it', () => {
    const encoded = xml.replace('<p>A new &amp; useful model.</p>', '&lt;img src=&quot;https://example.com/image.png&quot;&gt;A useful model.');
    expect(parseRss(encoded, source)[0].summary).toBe('A useful model.');
  });
  it('continues on partial source failure and reports the failed source', async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(new Response(xml)).mockRejectedValueOnce(new Error('outage'));
    const result = await collectNews([source, { ...source, name: 'Other' }], fakeFetch);
    expect(result.items).toHaveLength(1);
    expect(result.sources).toEqual([{ name: 'OpenAI', ok: true, count: 1 }, { name: 'Other', ok: false, count: 0 }]);
  });
  it('rejects oversized feeds', async () => {
    const result = await collectNews([source], vi.fn().mockResolvedValue(new Response('x', { headers: { 'content-length': '99999999' } })));
    expect(result.items).toEqual([]);
    expect(result.sources[0].ok).toBe(false);
  });
  it('fails closed when cron secret is absent or wrong', () => {
    expect(hasSecret(new Request('https://site.test'), undefined)).toBe(false);
    expect(hasSecret(new Request('https://site.test', { headers: { authorization: 'Bearer wrong' } }), 'secret')).toBe(false);
    expect(hasSecret(new Request('https://site.test', { headers: { authorization: 'Bearer secret' } }), 'secret')).toBe(true);
  });
});

describe('news source list', () => {
  it('covers several perspectives with unique, redirect-free https feeds', async () => {
    const { NEWS_SOURCES } = await import('@/lib/news-ingestion');
    const knownTags = ['Industry', 'Research', 'Open Source', 'Journalism', 'Safety', 'Policy', 'Global'];
    expect(new Set(NEWS_SOURCES.map(s => s.url)).size).toBe(NEWS_SOURCES.length);
    expect(new Set(NEWS_SOURCES.map(s => s.name)).size).toBe(NEWS_SOURCES.length);
    expect(new Set(NEWS_SOURCES.map(s => s.tag)).size).toBeGreaterThanOrEqual(5);
    for (const s of NEWS_SOURCES) {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(s.hosts.length).toBeGreaterThan(0);
      expect(knownTags).toContain(s.tag);
    }
  });
});
