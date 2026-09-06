"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Play,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Award,
  Clock,
  Database,
  TrendingUp,
  User,
  Check,
  X,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui';
import { currentUser } from '@/lib/firebase/authClient';
import { getRow } from '@/lib/firebase/db';
import { robots } from './registry';

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

type LeaderboardRun = {
  id: string;
  provider: ProviderId;
  model_id: string;
  svg: string;
  average: number;
  latency_ms: number;
  created_at: string;
  scores: Scores;
  user_id: string;
  creator_name: string;
};

type StatsEntry = {
  provider: string;
  avg_score: number;
  avg_latency: number;
  run_count: number;
};

export default function RobotBenchmarkPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'showcase'>('live');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [prompt, setPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [results, setResults] = useState<Record<ProviderId, Result>>({
    anthropic: { state: 'idle' },
    google: { state: 'idle' },
    openai: { state: 'idle' },
  });
  const [runningAll, setRunningAll] = useState(false);

  // Auth and Admin states
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Stats and leaderboard
  const [stats, setStats] = useState<StatsEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRun[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Inspector Modal
  const [selectedRun, setSelectedRun] = useState<LeaderboardRun | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/robot/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error('Failed to fetch benchmark stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/robot/generate', { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          setProviders(data.providers || []);
          setPrompt(data.prompt || '');
        }
      } catch (e) {
        console.error('Failed to fetch prompt/providers:', e);
      }

      // Check current auth & admin status
      try {
        const user = await currentUser();
        const uid = user?.uid || null;
        setUserId(uid);
        if (uid) {
          setIsAdmin((await getRow('app_admins', uid)) !== null);
        }
      } catch (e) {
        console.error('Failed to retrieve user auth or admin status:', e);
      }
    })();
    loadStats();
  }, []);

  const runOne = async (id: ProviderId) => {
    setResults(prev => ({ ...prev, [id]: { state: 'loading' } }));
    try {
      const res = await fetch('/api/robot/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: id, prompt }),
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
      // Refresh stats & leaderboard to capture new run
      loadStats();
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
    await Promise.all(available.map(id => runOne(id)));
    setRunningAll(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  const anyAvailable = providers.some(p => p.available);

  // Map robots to their brand colors in the showcase gallery
  const getShowcaseAccent = (modelName: string) => {
    const lower = modelName.toLowerCase();
    if (lower.includes('gemini')) return '#327E78'; // google cyan
    if (lower.includes('gpt') || lower.includes('codex')) return '#13796F'; // openai purple
    return '#087F75'; // anthropic pink as fallback / claude
  };

  return (
    <div className="min-w-0 w-full space-y-8 animate-fade-in max-w-7xl mx-auto px-1 pb-12">
      {/* Header */}
      <div className="card p-6 md:p-8 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-subtle blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple/5 blur-[90px] rounded-full pointer-events-none -z-10" />

        <div className="space-y-2">
          <h1 className="page-heading">Robot Benchmark</h1>
          <p className="text-sm text-foreground-muted max-w-3xl leading-relaxed">
            Compare generative capabilities of OpenAI, Anthropic, and Google on structural SVG code.
            Scoring evaluates element variety, color depth, anatomy markers, and payload complexity.
          </p>
        </div>
        {activeTab === 'live' && (
          isAdmin ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={runAll}
              disabled={runningAll || !anyAvailable}
              className="btn-brand inline-flex items-center gap-2.5 text-sm py-3 px-6 shadow-md cursor-pointer"
            >
              <Play className={`w-4 h-4 ${runningAll ? 'animate-pulse' : ''}`} />
              {runningAll ? 'Running models…' : 'Benchmark all models'}
            </motion.button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-soft border border-border text-xs font-semibold text-foreground-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Viewing Mode
            </div>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 min-w-0 border-b border-border">
        <button
          onClick={() => setActiveTab('live')}
          className={`min-w-0 min-h-11 px-2 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-bold border-b-2 transition-all duration-300 flex items-center justify-center gap-2 -mb-[2px] cursor-pointer ${
            activeTab === 'live'
              ? 'border-primary text-primary bg-surface-soft/60'
              : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-surface-hover/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Live Benchmark & Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('showcase')}
          className={`min-w-0 min-h-11 px-2 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-bold border-b-2 transition-all duration-300 flex items-center justify-center gap-2 -mb-[2px] cursor-pointer ${
            activeTab === 'showcase'
              ? 'border-purple text-primary bg-surface-soft/60'
              : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-surface-hover/50'
          }`}
        >
          <Award className="w-4 h-4" />
          Flagship Showcase
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'live' ? (
          <motion.div
            key="live-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="min-w-0 space-y-8"
          >
            {/* Prompt drawer */}
            <div className="card p-5 bg-surface/80 backdrop-blur-xs">
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <button
                  onClick={() => setShowPrompt(s => !s)}
                  className="text-xs font-bold text-foreground-muted tracking-[0.12em] font-mono inline-flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPrompt ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-primary" />}
                  {showPrompt ? (isAdmin ? 'HIDE / EDIT BENCHMARK PROMPT' : 'HIDE BENCHMARK PROMPT') : (isAdmin ? 'SHOW / EDIT BENCHMARK PROMPT' : 'SHOW BENCHMARK PROMPT')}
                </button>
                {isAdmin && (
                  <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-primary px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/5">
                    Admin Editor
                  </span>
                )}
              </div>
              <AnimatePresence>
                {showPrompt && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {isAdmin ? (
                      <div className="mt-4 space-y-2.5">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="w-full h-[250px] text-[12px] text-foreground font-mono bg-surface-elevated border border-border rounded-lg p-4 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y leading-relaxed"
                          placeholder="Enter custom benchmark prompt..."
                        />
                        <div className="flex justify-between items-center text-[11px] text-foreground-muted font-mono">
                          <span>Admins can modify the prompt payload for generations.</span>
                          <span>{prompt.length} / 4000 characters</span>
                        </div>
                      </div>
                    ) : (
                      <pre className="mt-4 break-words text-[12px] text-foreground-muted whitespace-pre-wrap leading-relaxed font-mono bg-surface-elevated border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        {prompt || 'Loading prompt directives…'}
                      </pre>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!anyAvailable && providers.length > 0 && (
              <Alert variant="error">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-danger mt-0.5" />
                  <div className="text-sm leading-relaxed">
                    No model API keys configured. Add <code className="text-mono px-1 py-0.5 bg-danger/5 rounded">ANTHROPIC_API_KEY</code>,{' '}
                    <code className="text-mono px-1 py-0.5 bg-danger/5 rounded">GOOGLE_API_KEY</code>, and <code className="text-mono px-1 py-0.5 bg-danger/5 rounded">OPENAI_API_KEY</code> to your{' '}
                    <code className="text-mono px-1 py-0.5 bg-danger/5 rounded">.env</code> (and Netlify settings) to enable generations.
                  </div>
                </div>
              </Alert>
            )}

            {/* Model aggregates / global stats row */}
            {!loadingStats && stats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {providers.map(p => {
                  const s = stats.find(entry => entry.provider === p.id);
                  return (
                    <motion.div
                      key={`agg-${p.id}`}
                      whileHover={{ scale: 1.015, y: -2 }}
                      className="card p-6 flex items-center justify-between relative overflow-hidden group bg-surface border-border transition-all duration-300"
                      style={{ borderLeft: `5px solid ${p.accent}` }}
                    >
                      {/* Dynamic ambient glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'var(--color-surface-elevated)' }}
                      />
                      <div className="z-10">
                        <div className="text-[11px] text-foreground-subtle uppercase tracking-[0.08em] font-mono">
                          {p.displayName}
                        </div>
                        <div className="text-3xl font-semibold mt-2 font-display" style={{ color: p.accent }}>
                          {s ? `${s.avg_score}/100` : '—'}
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-1">Average Rubric Rating</p>
                      </div>
                      <div className="text-right border-l border-border pl-6 space-y-2 z-10">
                        <div className="flex items-center justify-end gap-1.5 text-xs text-foreground-muted font-mono">
                          <Clock className="w-3.5 h-3.5 opacity-60" />
                          <span>{s ? `${(s.avg_latency / 1000).toFixed(2)}s` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-xs text-foreground-muted font-mono">
                          <Database className="w-3.5 h-3.5 opacity-60" />
                          <span>{s ? `${s.run_count} runs` : '0 runs'}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Model Live Grid */}
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground-muted flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Live Model Swarm
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map(p => (
                  <ModelCard
                    key={p.id}
                    provider={p}
                    result={results[p.id]}
                    isAdmin={isAdmin}
                    onRun={() => runOne(p.id)}
                  />
                ))}
              </div>
            </div>

            {/* Leaderboard section */}
            <div className="space-y-4">
              <div className="border-t border-border pt-8">
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground-muted flex items-center gap-2">
                   Community Leaderboard
                </h3>
                <p className="text-xs text-foreground-subtle mt-1 leading-relaxed">
                  The highest scoring model runs recorded from the SVG benchmark.
                </p>
              </div>

              {loadingStats ? (
                <div className="py-16 text-center text-foreground-faint text-sm">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 opacity-60 text-primary" />
                  Loading leaderboard…
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="card p-10 text-center text-foreground-muted text-sm bg-surface/50">
                  No benchmark runs have been saved yet. Run an available model to start the board.
                </div>
              ) : (
                <div className="card min-w-0 max-w-full overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-elevated text-foreground-muted text-xs font-mono uppercase"><tr><th scope="col" className="p-4">Rank</th><th scope="col" className="p-4">Output</th><th scope="col" className="p-4">Model</th><th scope="col" className="p-4">Submitted by</th><th scope="col" className="p-4">Score</th></tr></thead>
                    <tbody className="divide-y divide-border">{leaderboard.map((run, idx) => {
                      const provider = providers.find(item => item.id === run.provider);
                      return <tr key={run.id} className="hover:bg-surface-hover"><td className="p-4 font-mono text-foreground-muted">{String(idx + 1).padStart(2, '0')}</td><td className="p-3"><button onClick={() => setSelectedRun(run)} aria-label={`Inspect robot by ${provider?.displayName || run.provider}`} className="w-16 h-16 p-2 rounded-md border border-border bg-surface-elevated [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: run.svg }} /></td><td className="p-4"><button onClick={() => setSelectedRun(run)} className="font-display font-semibold text-foreground hover:text-primary text-left">{provider?.displayName || run.provider}</button><p className="text-xs text-foreground-muted font-mono mt-1">{run.model_id}</p></td><td className="p-4 text-foreground-muted">{run.creator_name}<p className="text-xs font-mono mt-1">{formatDate(run.created_at)}</p></td><td className="p-4 text-primary font-display font-semibold text-xl">{run.average}</td></tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* Showcase Gallery Tab */
          <motion.div
            key="showcase-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="min-w-0 space-y-6"
          >
            <div className="border-b border-border pb-4">
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground-muted flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-primary" /> Flagship Showcase Gallery
              </h3>
              <p className="text-xs text-foreground-subtle mt-1 leading-relaxed">
                Carefully engineered static SVG robot components demonstrating visual craftsmanship.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {robots.map(r => {
                const Component = r.component;
                const accent = getShowcaseAccent(r.model);
                return (
                  <motion.div
                    key={r.id}
                    whileHover={{ scale: 1.015, y: -2 }}
                    className="card min-w-0 overflow-hidden flex flex-col bg-surface group transition-all duration-300 hover:shadow-lg"
                    style={{ borderColor: `${accent}25` }}
                  >
                    <div className="p-4 bg-surface-elevated/70 border-b border-border flex items-center justify-between">
                      <div>
                        <div className="font-display font-bold text-sm text-foreground break-words group-hover:text-primary-muted transition-colors">{r.name}</div>
                        <div className="text-[11px] text-foreground-muted font-mono mt-0.5">
                          Model · {r.model}
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase font-mono tracking-wider px-2 py-0.5 rounded border"
                        style={{ color: accent, borderColor: `${accent}40`, background: `${accent}0b` }}
                      >
                        FLAGSHIP
                      </span>
                    </div>

                    <div
                      className="aspect-square flex items-center justify-center p-8 border-b border-border relative overflow-hidden"
                      style={{ background: 'var(--color-surface-elevated)' }}
                    >
                      {/* Ambient card glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: 'var(--color-surface-elevated)' }}
                      />

                      <div className="w-[85%] h-[85%] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 relative z-10">
                        <Component className="w-full h-full max-h-full" />
                      </div>
                    </div>

                    <div className="p-3.5 bg-surface-elevated/50 text-center flex-1 flex flex-col justify-end">
                      <span className="text-[10px] font-bold text-foreground-faint font-mono tracking-wider">
                        SERIAL: {r.id.toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Inspector Modal */}
      <AnimatePresence>
        {selectedRun && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRun(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-surface rounded-lg border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative z-10"
            >
              <button
                onClick={() => setSelectedRun(null)}
                aria-label="Close robot details"
                className="absolute top-4 right-4 p-2 rounded-lg border border-border hover:bg-surface-hover text-foreground-muted hover:text-foreground z-25 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Panel: SVG Render */}
                <div
                  className="aspect-square flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-border relative overflow-hidden"
                  style={{ background: 'var(--color-surface-elevated)' }}
                >
                  <div
                    className="w-[90%] h-[90%] flex items-center justify-center relative z-10"
                    dangerouslySetInnerHTML={{ __html: selectedRun.svg }}
                  />

                </div>

                {/* Right Panel: Scoring & Metadata */}
                <div className="p-8 flex flex-col justify-between h-full space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider font-mono"
                        style={{
                          color: providers.find(p => p.id === selectedRun.provider)?.accent || '#087F75',
                          borderColor: `${providers.find(p => p.id === selectedRun.provider)?.accent}40` || '#087F7540',
                          background: `${providers.find(p => p.id === selectedRun.provider)?.accent}0b` || '#087F750b'
                        }}
                      >
                        {selectedRun.provider}
                      </span>
                      <span className="text-sm font-bold text-foreground font-display">Score: {selectedRun.average}/100</span>
                    </div>

                    <h2 className="text-2xl font-display font-semibold text-foreground mt-3 leading-tight">
                      {providers.find(p => p.id === selectedRun.provider)?.displayName || selectedRun.provider}
                    </h2>
                    <p className="text-xs text-foreground-subtle font-mono mt-1">
                      Model ID: {selectedRun.model_id}
                    </p>

                    <div className="mt-6 space-y-4">
                      <ScoreBar label="Complexity (Element count)" value={selectedRun.scores.complexity} accent="#087F75" />
                      <ScoreBar label="Palette (Color count)" value={selectedRun.scores.palette} accent="#13796F" />
                      <ScoreBar label="Anatomy (Required markers)" value={selectedRun.scores.anatomy} accent="#327E78" />
                      <ScoreBar label="Craft (Payload weight)" value={selectedRun.scores.craft} accent="#087F75" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border-t border-border pt-4 text-xs space-y-2 text-foreground-muted">
                      <div className="flex justify-between">
                        <span>Generator:</span>
                        <span className="font-semibold text-foreground">{selectedRun.creator_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Generated:</span>
                        <span className="font-mono">{formatDate(selectedRun.created_at)}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>Latency:</span>
                        <span className="text-foreground">{selectedRun.latency_ms} ms</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => copyToClipboard(selectedRun.svg, selectedRun.id)}
                        className="w-full btn-brand inline-flex items-center justify-center gap-2 py-2.5 text-xs shadow-md cursor-pointer"
                      >
                        {copiedId === selectedRun.id ? (
                          <>
                            <Check className="w-4 h-4 animate-scale-in" />
                            Copied to Clipboard!
                          </>
                        ) : (
                          <>
                            <Code className="w-4 h-4" />
                            Copy SVG Markup
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelCard({
  provider,
  result,
  isAdmin,
  onRun,
}: {
  provider: ProviderInfo;
  result: Result;
  isAdmin: boolean;
  onRun: () => void;
}) {
  const isLoading = result.state === 'loading';
  const isOk = result.state === 'ok';
  const accent = provider.accent;

  return (
    <div
      className="card min-w-0 overflow-hidden flex flex-col group relative bg-surface border-border transition-all duration-300 hover:scale-[1.015] hover:border-border-strong hover:shadow-md"
      style={{
        borderColor: isOk ? `${accent}55` : undefined,
        boxShadow: isOk ? `0 4px 20px ${accent}0d` : undefined,
      }}
    >
      {/* Ambient card glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'var(--color-surface-elevated)' }}
      />

      <header className="px-5 py-4 border-b border-border bg-surface-elevated/70 flex items-center justify-between relative z-10">
        <div>
          <div className="font-bold text-sm text-foreground">{provider.displayName}</div>
          <div className="text-[11px] text-foreground-subtle font-mono">
            {provider.org} · {provider.model}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border font-mono"
            style={{ color: accent, borderColor: `${accent}40`, background: `${accent}0b` }}
          >
            {provider.badge}
          </span>
          {result.state === 'ok' && (
            <span className="text-sm font-semibold font-mono" style={{ color: accent }}>
              ★ {result.average}
            </span>
          )}
        </div>
      </header>

      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden border-b border-border"
        style={{ background: 'var(--color-surface-elevated)' }}
      >
        {isLoading && (
          <div className="text-center relative z-10">
            <Sparkles className="w-8 h-8 mx-auto text-primary animate-spin" />
            <p className="text-[12px] text-foreground-muted font-mono mt-3">Synthesizing SVG…</p>
          </div>
        )}
        {result.state === 'error' && (
          <div className="text-center px-6 relative z-10">
            <AlertCircle className="w-8 h-8 mx-auto text-danger" />
            <p className="text-xs text-danger mt-3 font-mono leading-relaxed">{result.error}</p>
          </div>
        )}
        {result.state === 'idle' && (
          <div className="text-center text-foreground-faint relative z-10">
            <div className="text-4xl opacity-30 animate-pulse"></div>
            <p className="text-xs mt-3 font-mono">{provider.available ? 'Ready to Benchmark' : 'No API Key Configured'}</p>
          </div>
        )}
        {isOk && (
          <div
            className="w-[80%] h-[80%] flex items-center justify-center relative z-10"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
        )}
      </div>

      {isOk && (
        <div className="px-5 py-4 space-y-3.5 bg-surface-elevated/40 relative z-10">
          <ScoreBar label="Complexity" value={result.scores.complexity} accent={accent} />
          <ScoreBar label="Palette" value={result.scores.palette} accent={accent} />
          <ScoreBar label="Anatomy" value={result.scores.anatomy} accent={accent} />
          <ScoreBar label="Craft" value={result.scores.craft} accent={accent} />
          <p className="text-[10px] text-foreground-faint mt-2 font-mono text-right">
            {result.latency_ms} ms · parsed & graded
          </p>
        </div>
      )}

      <div className="px-5 py-4 mt-auto relative z-10">
        {isAdmin ? (
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={onRun}
            disabled={isLoading || !provider.available}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            style={{
              background: provider.available
                ? accent
                : 'var(--color-border)',
              color: provider.available ? '#ffffff' : 'var(--color-foreground-faint)',
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing…
              </>
            ) : isOk ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Re-run Rubric
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Run Benchmark
              </>
            )}
          </motion.button>
        ) : (
          <div className="w-full text-center py-2.5 px-4 rounded-lg border border-dashed border-border text-[11px] text-foreground-faint bg-surface-soft font-mono">
            ★ Generation Restricted to Admins
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
        <span>{label}</span>
        <span className="font-bold text-foreground font-mono">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-border mt-1 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: accent,
          }}
        />
      </div>
    </div>
  );
}
