type ShareBrowser = { share?: (data: ShareData) => Promise<void>; clipboard?: { writeText: (text: string) => Promise<void> } };
export async function shareNews(item: { title: string; source_url: string }, browser: ShareBrowser = navigator): Promise<'shared' | 'copied' | 'cancelled'> {
  if (browser.share) {
    try {
      await browser.share({ title: item.title, url: item.source_url });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (!browser.clipboard) throw new Error('Sharing is unavailable. Copy the Read source link to share this story.');
  await browser.clipboard.writeText(item.source_url);
  return 'copied';
}
