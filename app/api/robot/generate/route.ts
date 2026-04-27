import { NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import {
  generate,
  PROVIDER_MODELS,
  ROBOT_PROMPT,
  scoreSvg,
  averageScore,
  type ProviderId,
} from '@/lib/robotProviders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a robot SVG from one of the frontier models. Body shape:
 *   { provider: 'anthropic' | 'google' | 'openai', prompt?: string }
 *
 * Returns:
 *   {
 *     ok: true,
 *     provider, model_id, svg, scores: {…}, average,
 *     latency_ms, prompt_used
 *   }
 *
 * Rate-limited per IP (5 req / 60s).
 */
export async function POST(req: Request) {
  const id = getClientId(req);
  if (!rateLimit(`robot:${id}`, 5, 60_000)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  let body: { provider?: ProviderId; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const provider = body.provider;
  if (!provider || !PROVIDER_MODELS.some(m => m.id === provider)) {
    return NextResponse.json(
      { ok: false, error: 'provider must be one of: anthropic, google, openai' },
      { status: 400 },
    );
  }

  const prompt = (body.prompt || ROBOT_PROMPT).slice(0, 4000);

  const startedAt = Date.now();
  const result = await generate(provider, prompt);
  const latency_ms = Date.now() - startedAt;

  if (!result.ok) {
    return NextResponse.json({ ok: false, provider, error: result.error, latency_ms }, { status: 502 });
  }

  const scores = scoreSvg(result.svg);
  return NextResponse.json({
    ok: true,
    provider,
    model_id: result.modelUsed,
    svg: result.svg,
    scores,
    average: averageScore(scores),
    latency_ms,
    prompt_used: prompt === ROBOT_PROMPT ? 'default' : 'custom',
  });
}

/**
 * GET — return the canonical prompt + provider availability so the UI can
 * disable buttons for missing keys without leaking secrets.
 */
export async function GET() {
  const status = PROVIDER_MODELS.map(m => ({
    id: m.id,
    displayName: m.displayName,
    org: m.org,
    badge: m.badge,
    accent: m.accent,
    available:
      (m.id === 'anthropic' && !!process.env.ANTHROPIC_API_KEY) ||
      (m.id === 'google' && !!process.env.GOOGLE_API_KEY) ||
      (m.id === 'openai' && !!process.env.OPENAI_API_KEY),
    model: process.env[m.modelEnv] || m.defaultModel,
  }));
  return NextResponse.json({ prompt: ROBOT_PROMPT, providers: status });
}
