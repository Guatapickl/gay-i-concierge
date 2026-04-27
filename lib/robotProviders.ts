/**
 * Robot benchmark providers — Anthropic / Google / OpenAI.
 *
 * Direct REST so we don't add three SDK dependencies. Each function returns
 * `{ ok, svg, error, raw }`. Callers normalize `svg` into something safe to
 * inject server-side (we still strip <script> in the consumer route).
 */

export type ProviderId = 'anthropic' | 'google' | 'openai';

export type ProviderModel = {
  id: ProviderId;
  displayName: string;
  org: 'Anthropic' | 'Google' | 'OpenAI';
  modelEnv: string;
  defaultModel: string;
  badge: string;
  /** Brand color used for card border / score bars. */
  accent: string;
};

export const PROVIDER_MODELS: ProviderModel[] = [
  {
    id: 'anthropic',
    displayName: 'Claude Opus 4.7',
    org: 'Anthropic',
    modelEnv: 'ROBOT_MODEL_ANTHROPIC',
    defaultModel: 'claude-opus-4-7',
    badge: 'Frontier',
    accent: '#e0007a',
  },
  {
    id: 'google',
    displayName: 'Gemini 3.1 Pro',
    org: 'Google',
    modelEnv: 'ROBOT_MODEL_GOOGLE',
    defaultModel: 'gemini-3.1-pro',
    badge: 'Multimodal',
    accent: '#0099cc',
  },
  {
    id: 'openai',
    displayName: 'GPT 5.5',
    org: 'OpenAI',
    modelEnv: 'ROBOT_MODEL_OPENAI',
    defaultModel: 'gpt-5.5',
    badge: 'Flagship',
    accent: '#7c3aed',
  },
];

/**
 * The single shared prompt sent to every provider. Modeled to elicit
 * each model's distinctive style while constraining output to a clean
 * SVG suitable for direct rendering.
 */
export const ROBOT_PROMPT = `You are an SVG artist participating in the Gay I Club NYC Robot Benchmark — hosted at gayiclub.com, a queer NYC community exploring AI.

Task: Create a single SVG robot illustration with viewBox "0 0 200 200".

Requirements:
- Include identifiable anatomy: head, body, two arms, two legs, eyes, and an antenna.
- Add at least one decorative or expressive detail unique to your aesthetic.
- Use a queer-coded color palette: hot pink (#ff2d9b), purple (#7c2fff), cyan (#0099cc), with any complementary tones you choose.
- Show your model's distinctive style — geometric minimalism, retro-futurism, or expressive flair are all welcome.

Output: Return ONLY valid, self-contained SVG markup beginning with \`<svg\` and ending with \`</svg>\`. No explanations, no fenced code blocks, no narration outside the SVG.`;

export type ProviderResult =
  | { ok: true; svg: string; raw: string; modelUsed: string }
  | { ok: false; error: string };

export function modelIdFor(provider: ProviderModel): string {
  return process.env[provider.modelEnv] || provider.defaultModel;
}

export function isProviderAvailable(id: ProviderId): boolean {
  if (id === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
  if (id === 'google') return !!process.env.GOOGLE_API_KEY;
  if (id === 'openai') return !!process.env.OPENAI_API_KEY;
  return false;
}

/** Pull the first <svg>…</svg> block out of any wrapper text/code fence. */
export function extractSvg(text: string): string | null {
  if (!text) return null;
  const fenced = text.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/i);
  const haystack = fenced ? fenced[1] : text;
  const match = haystack.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

/**
 * Server-side sanitization. Strips <script>, on* handlers, and javascript:
 * URLs. We still render via dangerouslySetInnerHTML so we want to keep this
 * conservative; legitimate robot SVGs don't need any of these.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
}

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

export async function generateAnthropic(
  provider: ProviderModel,
  prompt: string,
): Promise<ProviderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  const model = modelIdFor(provider);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { ok: false, error: `Anthropic ${res.status}: ${txt.slice(0, 220)}` };
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = (json.content || [])
    .map(c => (c.type === 'text' ? c.text || '' : ''))
    .join('');
  const svg = extractSvg(raw);
  if (!svg) return { ok: false, error: 'No <svg> block in response' };
  return { ok: true, svg: sanitizeSvg(svg), raw, modelUsed: model };
}

export async function generateGoogle(
  provider: ProviderModel,
  prompt: string,
): Promise<ProviderResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return { ok: false, error: 'GOOGLE_API_KEY not set' };
  const model = modelIdFor(provider);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4000 },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { ok: false, error: `Google ${res.status}: ${txt.slice(0, 220)}` };
  }
  type GoogleResp = {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const json = (await res.json()) as GoogleResp;
  const raw = (json.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('');
  const svg = extractSvg(raw);
  if (!svg) return { ok: false, error: 'No <svg> block in response' };
  return { ok: true, svg: sanitizeSvg(svg), raw, modelUsed: model };
}

export async function generateOpenAI(
  provider: ProviderModel,
  prompt: string,
): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY not set' };
  const model = modelIdFor(provider);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { ok: false, error: `OpenAI ${res.status}: ${txt.slice(0, 220)}` };
  }
  type OpenAIResp = { choices?: { message?: { content?: string } }[] };
  const json = (await res.json()) as OpenAIResp;
  const raw = json.choices?.[0]?.message?.content || '';
  const svg = extractSvg(raw);
  if (!svg) return { ok: false, error: 'No <svg> block in response' };
  return { ok: true, svg: sanitizeSvg(svg), raw, modelUsed: model };
}

export async function generate(
  id: ProviderId,
  prompt: string = ROBOT_PROMPT,
): Promise<ProviderResult> {
  const provider = PROVIDER_MODELS.find(m => m.id === id);
  if (!provider) return { ok: false, error: `unknown provider: ${id}` };
  if (id === 'anthropic') return generateAnthropic(provider, prompt);
  if (id === 'google') return generateGoogle(provider, prompt);
  return generateOpenAI(provider, prompt);
}

// ---------------------------------------------------------------------------
// Objective scoring (no random rolls — derived from the SVG itself)
// ---------------------------------------------------------------------------

export type ScoreBreakdown = {
  complexity: number;  // 0-100, normalized element count
  palette: number;     // 0-100, distinct color count (capped at 12)
  anatomy: number;     // 0-100, fraction of required parts referenced
  craft: number;       // 0-100, payload heft normalized (proxy for effort)
};

export function scoreSvg(svg: string): ScoreBreakdown {
  const elementMatches = svg.match(
    /<(path|circle|rect|line|polygon|polyline|ellipse|g|use|text)\b/gi,
  );
  const elementCount = elementMatches?.length ?? 0;
  const complexity = Math.min(100, Math.round((elementCount / 40) * 100));

  const colorMatches = svg.match(/#[0-9a-fA-F]{3,8}\b|rgb\([^)]+\)|rgba\([^)]+\)/g) || [];
  const distinctColors = new Set(colorMatches.map(c => c.toLowerCase())).size;
  const palette = Math.min(100, Math.round((distinctColors / 12) * 100));

  const requiredParts = ['head', 'body', 'arm', 'leg', 'eye', 'antenna'];
  const lower = svg.toLowerCase();
  const presentParts = requiredParts.filter(
    p => lower.includes(`id="${p}`) || lower.includes(`class="${p}`) ||
         lower.includes(`<!--${p}`) || lower.includes(`<!-- ${p}`) ||
         lower.includes(`label="${p}`) || lower.includes(`data-part="${p}"`)
  );
  // If the model didn't use semantic markers, give partial credit for element variety.
  const anatomy = presentParts.length > 0
    ? Math.round((presentParts.length / requiredParts.length) * 100)
    : Math.min(100, Math.round((elementCount / 8) * 100));

  // Craft proxy: bytes after stripping whitespace, capped at ~3KB.
  const compact = svg.replace(/\s+/g, ' ').trim();
  const craft = Math.min(100, Math.round((compact.length / 3000) * 100));

  return { complexity, palette, anatomy, craft };
}

export function averageScore(s: ScoreBreakdown): number {
  return Math.round((s.complexity + s.palette + s.anatomy + s.craft) / 4);
}
