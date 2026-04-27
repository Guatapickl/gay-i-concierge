import { createClient } from '@/utils/supabase/server';
import DashboardView from '@/components/DashboardView';
import LandingHero from '@/components/LandingHero';

/**
 * Home route. Server component so we can pick the variant before the
 * client renders — no flash of unauthenticated content.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return <DashboardView />;
  return <LandingHero />;
}
