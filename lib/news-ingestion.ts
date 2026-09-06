import { timingSafeEqual } from 'node:crypto';

export type NewsInput = {
  title: string; summary: string; source_url: string; source_name: string | null;
  tag: string | null; tag_color: string | null; published_at: string | null;
  is_hot: boolean; relevance_score: number | null;
};
export type NewsSource = { name: string; url: string; hosts: string[]; tag: string };
export const NEWS_SOURCES: NewsSource[] = [
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', hosts: ['openai.com'], tag: 'Industry' },
  { name: 'Google AI', url: 'https://blog.google/innovation-and-ai/technology/ai/rss/', hosts: ['blog.google'], tag: 'Industry' },
  { name: 'MIT News', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', hosts: ['news.mit.edu'], tag: 'Research' },
];

export function hasSecret(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.get('authorization') || '';
  const token = /^Bearer /i.test(header) ? header.slice(7) : '';
  const a = Buffer.from(token), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function canonicalNewsUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['fbclid', 'gclid', 'mc_cid', 'mc_eid'].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch { return null; }
}

const trimmed = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
export function normalizeNewsItem(raw: unknown): NewsInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const title = trimmed(value.title, 300), summary = trimmed(value.summary, 2000);
  const source_url = canonicalNewsUrl(value.source_url);
  if (!title || !summary || !source_url) return null;
  const published = typeof value.published_at === 'string' ? Date.parse(value.published_at) : NaN;
  return {
    title, summary, source_url, source_name: trimmed(value.source_name, 120) || null,
    tag: trimmed(value.tag, 60) || null, tag_color: /^#[\da-f]{6}$/i.test(String(value.tag_color)) ? String(value.tag_color) : null,
    published_at: Number.isFinite(published) ? new Date(published).toISOString() : null,
    is_hot: value.is_hot === true,
    relevance_score: typeof value.relevance_score === 'number' && Number.isFinite(value.relevance_score) ? Math.max(0, Math.min(1, value.relevance_score)) : null,
  };
}

// These fixed publishers provide RSS 2.0. We extract only text fields, never render feed HTML,
// fetch linked pages, expand XML entities, or honor embedded feed instructions.
function plainText(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
      if (entity.startsWith('#')) {
        const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
      }
      return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' } as Record<string, string>)[entity.toLowerCase()] || match;
    }).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
export function parseRss(xml: string, source: NewsSource): NewsInput[] {
  if (!/<rss\b/i.test(xml)) throw new Error('Expected RSS feed');
  const items: NewsInput[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const field = (name: string) => plainText(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(match[1])?.[1] || '');
    const link = canonicalNewsUrl(field('link'));
    if (!link || !source.hosts.includes(new URL(link).hostname)) continue;
    const item = normalizeNewsItem({ title: field('title'), summary: field('description') || field('content:encoded') || 'Read the full announcement at the source.', source_url: link, source_name: source.name, tag: source.tag, published_at: field('pubDate') });
    if (item) items.push(item);
    if (items.length >= 15) break;
  }
  return items;
}

export async function readBoundedText(response: Response, maxBytes = 1_500_000): Promise<string> {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Response too large');
  if (!response.body) throw new Error('Empty response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Response too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

export async function collectNews(sources = NEWS_SOURCES, fetcher: typeof fetch = fetch) {
  const results = await Promise.all(sources.map(async source => {
    try {
      const response = await fetcher(source.url, { signal: AbortSignal.timeout(12_000), redirect: 'error', cache: 'no-store', headers: { Accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': 'GayIClub-News/1.0' } });
      if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
      const items = parseRss(await readBoundedText(response), source);
      if (!items.length) throw new Error('No usable feed entries');
      return { status: { name: source.name, ok: true, count: items.length }, items };
    } catch {
      return { status: { name: source.name, ok: false, count: 0 }, items: [] as NewsInput[] };
    }
  }));
  return { items: results.flatMap(result => result.items), sources: results.map(result => result.status) };
}
