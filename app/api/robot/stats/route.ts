import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch Aggregated Stats (RPC with JS Fallback)
  let stats: any[] = [];
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_provider_stats');

  if (rpcData && !rpcError) {
    stats = rpcData;
  } else {
    if (rpcError) {
      console.warn('RPC get_provider_stats failed, falling back to JS aggregation:', rpcError.message);
    }
    // JS Fallback: fetch runs and aggregate
    const { data: allRuns, error: runsError } = await supabase
      .from('robot_benchmarks')
      .select('provider, latency_ms, average');

    if (allRuns && !runsError) {
      const groups: Record<string, { totalScore: number; totalLatency: number; count: number }> = {};
      allRuns.forEach(r => {
        if (!groups[r.provider]) {
          groups[r.provider] = { totalScore: 0, totalLatency: 0, count: 0 };
        }
        groups[r.provider].totalScore += r.average;
        groups[r.provider].totalLatency += r.latency_ms;
        groups[r.provider].count += 1;
      });

      stats = Object.entries(groups).map(([provider, g]) => ({
        provider,
        avg_score: Math.round((g.totalScore / g.count) * 10) / 10,
        avg_latency: Math.round(g.totalLatency / g.count),
        run_count: g.count,
      }));
    }
  }

  // 2. Fetch Leaderboard (Ranked by average score desc)
  let leaderboard: any[] = [];
  const { data: lbData, error: lbError } = await supabase
    .from('robot_benchmarks')
    .select(`
      id,
      provider,
      model_id,
      svg,
      average,
      latency_ms,
      created_at,
      scores,
      user_id,
      user_profiles:user_id ( full_name )
    `)
    .order('average', { ascending: false })
    .limit(12);

  if (!lbError && lbData) {
    leaderboard = lbData.map((row: any) => ({
      ...row,
      creator_name: row.user_profiles?.full_name || 'Anonymous Member',
    }));
  } else {
    if (lbError) {
      console.warn('Leaderboard query with profiles join failed, trying query without join:', lbError.message);
    }
    // Fallback: Query without join
    const { data: fallbackLbData } = await supabase
      .from('robot_benchmarks')
      .select('id, provider, model_id, svg, average, latency_ms, created_at, scores, user_id')
      .order('average', { ascending: false })
      .limit(12);

    if (fallbackLbData) {
      leaderboard = fallbackLbData.map((row: any) => ({
        ...row,
        creator_name: 'Anonymous Member',
      }));
    }
  }

  return NextResponse.json({
    stats,
    leaderboard,
  });
}
