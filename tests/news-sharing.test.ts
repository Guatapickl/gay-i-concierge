import { describe, expect, it, vi } from 'vitest';
import { shareNews } from '@/lib/news-sharing';
const item = { title: 'AI research', source_url: 'https://openai.com/index/a' };
describe('member news sharing', () => {
  it('uses native sharing when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined), writeText = vi.fn();
    expect(await shareNews(item, { share, clipboard: { writeText } })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: item.title, url: item.source_url });
    expect(writeText).not.toHaveBeenCalled();
  });
  it('copies the source link when native sharing is unavailable or fails', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareNews(item, { clipboard: { writeText } })).toBe('copied');
    expect(await shareNews(item, { share: vi.fn().mockRejectedValue(new Error('unsupported')), clipboard: { writeText } })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(item.source_url);
  });
  it('respects cancellation without copying', async () => {
    const writeText = vi.fn();
    expect(await shareNews(item, { share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')), clipboard: { writeText } })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });
});
