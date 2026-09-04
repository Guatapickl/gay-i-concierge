import { getServerUser } from '@/lib/firebase/session';
import DashboardView from '@/components/DashboardView';
import LandingHero from '@/components/LandingHero';

/**
 * Home route. Server component so we can pick the variant before the
 * client renders — no flash of unauthenticated content.
 */
export default async function HomePage() {
  const user = await getServerUser();

  if (user) return <DashboardView />;
  return <LandingHero />;
}
