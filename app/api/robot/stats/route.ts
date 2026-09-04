import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { adminRowOf } from '@/lib/firebase/adminDb';
import { callerFromRequest } from '../../_lib/caller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BenchmarkRow = {
  id: string;
  provider: string;
  model_id: string;
  svg: string;
  average: number;
  latency_ms: number;
  created_at: string | null;
  scores: Record<string, number>;
  user_id: string | null;
};

type ProviderStat = { provider: string; avg_score: number; avg_latency: number; run_count: number };

/** Firestore `in` accepts ≤30 values. */
function chunk<T>(arr: T[], size = 30): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Replacement for the `get_provider_stats()` Postgres RPC: group all runs by
 * provider and average score/latency (same rounding as the SQL).
 */
function aggregateProviderStats(runs: Pick<BenchmarkRow, 'provider' | 'latency_ms' | 'average'>[]): ProviderStat[] {
  const groups: Record<string, { totalScore: number; totalLatency: number; count: number }> = {};
  for (const r of runs) {
    if (!groups[r.provider]) groups[r.provider] = { totalScore: 0, totalLatency: 0, count: 0 };
    groups[r.provider].totalScore += Number(r.average) || 0;
    groups[r.provider].totalLatency += Number(r.latency_ms) || 0;
    groups[r.provider].count += 1;
  }
  return Object.entries(groups).map(([provider, g]) => ({
    provider,
    avg_score: Math.round((g.totalScore / g.count) * 10) / 10,
    avg_latency: Math.round(g.totalLatency / g.count),
    run_count: g.count,
  }));
}

export async function GET(req: Request) {
  const user = await callerFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = adminDb();
  const col = db.collection('robot_benchmarks');

  // 1. Aggregated stats (was RPC get_provider_stats)
  let stats: ProviderStat[] = [];
  try {
    const snap = await col.select('provider', 'latency_ms', 'average').get();
    stats = aggregateProviderStats(snap.docs.map(d => d.data() as BenchmarkRow));
  } catch (e) {
    console.warn('Aggregating provider stats failed:', e instanceof Error ? e.message : e);
  }

  // 2. Leaderboard (ranked by average score desc) + creator names
  let leaderboard: Array<BenchmarkRow & { creator_name: string }> = [];
  try {
    const snap = await col.orderBy('average', 'desc').limit(12).get();
    const rows = snap.docs.map(d => adminRowOf<BenchmarkRow>(d));

    const names = new Map<string, string>();
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter((v): v is string => !!v)));
    try {
      for (const ids of chunk(userIds)) {
        const profiles = await db.collection('user_profiles').where('__name__', 'in', ids).get();
        for (const p of profiles.docs) {
          const full = (p.data() as { full_name?: string | null }).full_name;
          if (full) names.set(p.id, full);
        }
      }
    } catch (e) {
      console.warn('Leaderboard profile lookup failed, using anonymous names:', e instanceof Error ? e.message : e);
    }

    leaderboard = rows.map(row => ({
      ...row,
      creator_name: (row.user_id && names.get(row.user_id)) || 'Anonymous Member',
    }));
  } catch (e) {
    console.warn('Leaderboard query failed:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({
    stats,
    leaderboard,
  });
}
