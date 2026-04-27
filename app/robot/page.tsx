"use client";

import { useEffect, useState } from 'react';
import { Sparkles, Play, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert } from '@/components/ui';

/**
 * Robot Benchmark — multi-model side-by-side comparison.
 *
 * Sends the shared prompt to Claude Opus 4.7, Gemini 3.1 Pro, and GPT 5.5,
 * scores the resulting SVGs on objective rubric metrics (no random rolls),
 * and lets the user re-run any model individually.
 */

type ProviderId = 'anthropic' | 'google' | 'openai';

type ProviderInfo = {
  id: ProviderId;
  displayName: string;
  org: string;
  badge: string;
  accent: string;
  available: boolean;
  model: string;
};

type Scores = {
  complexity: number;
  palette: number;
  anatomy: number;
  craft: number;
};

type Result =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; error: string }
  | {
      state: 'ok';
      svg: string;
      scores: Scores;
      average: number;
      latency_ms: number;
      model_id: string;
    };

export default function RobotBenchmarkPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [results, setResults] = useState<Record<ProviderId, Result>>({
    anthropic: { state: 'idle' },
    google: { state: 'idle' },
    openai: { state: 'idle' },
  });
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/robot/generate', { method: 'GET' });
      const data = await res.json();
      setProviders(data.providers || []);
      setPrompt(data.prompt || '');
    })();
  }, []);

  const runOne = async (id: ProviderId) => {
    setResults(prev => ({ ...prev, [id]: { state: 'loading' } }));
    try {
      const res = await fetch('/api/robot/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResults(prev => ({
          ...prev,
          [id]: { state: 'error', error: data.error || `HTTP ${res.status}` },
        }));
        return;
      }
      setResults(prev => ({
        ...prev,
        [id]: {
          state: 'ok',
          svg: data.svg,
          scores: data.scores,
          average: data.average,
          latency_ms: data.latency_ms,
          model_id: data.model_id,
        },
      }));
    } catch (e) {
      setResults(prev => ({
        ...prev,
        [id]: { state: 'error', error: e instanceof Error ? e.message : String(e) },
      }));
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    const available = providers.filter(p => p.available).map(p => p.id);
    // Run in parallel — 3 different APIs, no contention
    await Promise.all(available.map(id => runOne(id)));
    setRunningAll(false);
  };

  const anyAvailable = providers.some(p => p.available);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="card-tinted p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display font-extrabold text-base text-foreground mb-1 flex items-center gap-2">
            🤖 SVG Robot Benchmark
          </div>
          <p className="text-[13px] text-foreground-muted max-w-xl">
            Three frontier models receive the same prompt. Scoring is objective —
            element count, palette breadth, anatomy coverage, and payload heft.
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={runningAll || !anyAvailable}
          className="btn-brand inline-flex items-center gap-2 text-sm"
        >
          <Play className="w-4 h-4" />
          {runningAll ? 'Running…' : 'Run all models'}
        </button>
      </div>

      {/* Prompt drawer */}
      <div className="card p-4">
        <button
          onClick={() => setShowPrompt(s => !s)}
          className="text-xs font-bold text-foreground-faint tracking-[0.1em] font-mono inline-flex items-center gap-1.5 hover:text-foreground-muted transition-colors"
        >
          {showPrompt ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPrompt ? 'HIDE PROMPT' : 'SHOW PROMPT'}
        </button>
        {showPrompt && (
          <pre className="mt-3 text-[12px] text-foreground-muted whitespace-pre-wrap leading-relaxed font-mono bg-surface-elevated border border-border rounded-lg p-3 max-h-[260px] overflow-y-auto">
            {prompt || 'Loading…'}
          </pre>
        )}
      </div>

      {!anyAvailable && providers.length > 0 && (
        <Alert variant="error">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-sm">
              No model API keys configured. Add{' '}
              <code className="text-mono">ANTHROPIC_API_KEY</code>,{' '}
              <code className="text-mono">GOOGLE_API_KEY</code>, and{' '}
              <code className="text-mono">OPENAI_API_KEY</code> to your{' '}
              <code className="text-mono">.env</code> (and Netlify env vars) — then redeploy.
            </div>
          </div>
        </Alert>
      )}

      {/* Model grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(p => (
          <ModelCard
            key={p.id}
            provider={p}
            result={results[p.id]}
            onRun={() => runOne(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ModelCard({
  provider,
  result,
  onRun,
}: {
  provider: ProviderInfo;
  result: Result;
  onRun: () => void;
}) {
  const isLoading = result.state === 'loading';
  const isOk = result.state === 'ok';
  const accent = provider.accent;

  return (
    <div
      className="card overflow-hidden flex flex-col"
      style={{
        borderColor: isOk ? `${accent}66` : undefined,
        boxShadow: isOk ? `0 4px 20px ${accent}1f` : undefined,
      }}
    >
      <header className="px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
        <div>
          <div className="font-bold text-sm text-foreground">{provider.displayName}</div>
          <div className="text-[11px] text-foreground-subtle font-mono">
            {provider.org} · {provider.model}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
            style={{ color: accent, borderColor: `${accent}55`, background: `${accent}18` }}
          >
            {provider.badge}
          </span>
          {result.state === 'ok' && (
            <span className="text-sm font-extrabold" style={{ color: accent }}>
              {result.average}
            </span>
          )}
        </div>
      </header>

      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden"
        style={{ background: '#fdfcff' }}
      >
        {isLoading && (
          <div className="text-center">
            <Sparkles className="w-7 h-7 mx-auto text-foreground-faint animate-spin-slow" />
            <p className="text-[12px] text-foreground-faint mt-2">Generating…</p>
          </div>
        )}
        {result.state === 'error' && (
          <div className="text-center px-6">
            <AlertCircle className="w-6 h-6 mx-auto text-danger" />
            <p className="text-[11px] text-danger mt-2 font-mono">
              {result.error}
            </p>
          </div>
        )}
        {result.state === 'idle' && (
          <div className="text-center text-foreground-faint">
            <div className="text-3xl opacity-40">🤖</div>
            <p className="text-xs mt-1">{provider.available ? 'Not yet run' : 'No API key'}</p>
          </div>
        )}
        {isOk && (
          <div
            className="w-[80%] h-[80%] flex items-center justify-center"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
        )}
      </div>

      {isOk && (
        <div className="px-4 py-3 border-t border-border space-y-1.5">
          <ScoreBar label="Complexity" value={result.scores.complexity} accent={accent} />
          <ScoreBar label="Palette" value={result.scores.palette} accent={accent} />
          <ScoreBar label="Anatomy" value={result.scores.anatomy} accent={accent} />
          <ScoreBar label="Craft" value={result.scores.craft} accent={accent} />
          <p className="text-[10px] text-foreground-faint mt-1.5 font-mono">
            {result.latency_ms} ms · scored from SVG
          </p>
        </div>
      )}

      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={onRun}
          disabled={isLoading || !provider.available}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: provider.available
              ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
              : '#f0e0f8',
          }}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating…
            </>
          ) : isOk ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Re-run
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Run
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
        <span>{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-border-subtle mt-0.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${accent}, #7c2fff)`,
          }}
        />
      </div>
    </div>
  );
}
