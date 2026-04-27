import DashboardView from '@/components/DashboardView';

/**
 * Legacy /hub URL — same dashboard now lives at `/`.
 * Kept as a working alias so existing links/bookmarks don't 404.
 */
export default function HubPage() {
  return <DashboardView />;
}
