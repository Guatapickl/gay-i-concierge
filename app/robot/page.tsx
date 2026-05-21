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
import { supabase } from '@/lib/supabase';
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
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id || null;
        setUserId(uid);
        if (uid) {
          const { count } = await supabase
            .from('app_admins')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', uid);
          setIsAdmin(!!count && count > 0);
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
    if (lower.includes('gemini')) return '#0099cc'; // google cyan
    if (lower.includes('gpt') || lower.includes('codex')) return '#7c2fff'; // openai purple
    return '#ff2d9b'; // anthropic pink as fallback / claude
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-1 pb-12">
      {/* Header */}
      <div className="card-tinted p-6 md:p-8 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-subtle blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple/5 blur-[90px] rounded-full pointer-events-none -z-10" />
        
        <div className="space-y-2">
          <div className="font-display font-extrabold text-2xl md:text-3xl text-foreground flex items-center gap-3">
            <span className="inline-block animate-bounce">🤖</span> SVG Robot Benchmarking Hub
          </div>
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
              {runningAll ? 'Running swarms…' : 'Benchmark all models'}
            </motion.button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-soft border border-border text-xs font-semibold text-foreground-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Viewing Mode
            </div>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-8 py-4 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2.5 -mb-[2px] cursor-pointer ${
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
          className={`px-8 py-4 text-sm font-bold border-b-2 transition-all duration-300 flex items-center gap-2.5 -mb-[2px] cursor-pointer ${
            activeTab === 'showcase'
              ? 'border-purple text-purple bg-surface-soft/60'
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
            className="space-y-8"
          >
            {/* Prompt drawer */}
            <div className="card p-5 bg-surface/80 backdrop-blur-xs">
              <div className="flex justify-between items-center">
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
                          className="w-full h-[250px] text-[12px] text-foreground font-mono bg-surface-elevated border border-border rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y leading-relaxed"
                          placeholder="Enter custom benchmark prompt..."
                        />
                        <div className="flex justify-between items-center text-[11px] text-foreground-muted font-mono">
                          <span>Admins can modify the prompt payload for generations.</span>
                          <span>{prompt.length} / 4000 characters</span>
                        </div>
                      </div>
                    ) : (
                      <pre className="mt-4 text-[12px] text-foreground-muted whitespace-pre-wrap leading-relaxed font-mono bg-surface-elevated border border-border rounded-xl p-4 max-h-[300px] overflow-y-auto">
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
                        style={{ background: `radial-gradient(circle at 50% -20%, ${p.accent}0a, transparent 65%)` }}
                      />
                      <div className="z-10">
                        <div className="text-[11px] text-foreground-subtle uppercase tracking-[0.08em] font-mono">
                          {p.displayName}
                        </div>
                        <div className="text-3xl font-black mt-2 font-display" style={{ color: p.accent }}>
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
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-foreground-muted flex items-center gap-2">
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
                <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-foreground-muted flex items-center gap-2">
                  🏆 Community Leaderboard
                </h3>
                <p className="text-xs text-foreground-subtle mt-1 leading-relaxed">
                  The highest scoring model runs recorded from the SVG benchmark.
                </p>
              </div>

              {loadingStats ? (
                <div className="py-16 text-center text-foreground-faint text-sm">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 opacity-60 text-primary" />
                  Decoding leaderboard matrix…
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="card p-10 text-center text-foreground-muted text-sm bg-surface/50">
                  No benchmark runs have been saved yet. Click "Run" on any model above to seed the board!
                </div>
              ) : (
                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 }
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                  {leaderboard.map((run, idx) => {
                    const p = providers.find(prov => prov.id === run.provider);
                    const accent = p?.accent || '#7c2fff';
                    return (
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0 }
                        }}
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className="card cursor-pointer group flex flex-col overflow-hidden bg-surface transition-all duration-300 hover:scale-[1.015] hover:border-border-strong hover:shadow-md"
                        style={{
                          borderColor: `${accent}22`,
                        }}
                      >
                        <div 
                          className="aspect-square flex items-center justify-center relative p-5 transition-colors"
                          style={{ background: 'radial-gradient(circle, rgba(250,245,255,0.7) 0%, rgba(255,255,255,1) 100%)' }}
                        >
                          <span className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-white/95 shadow-xs text-xs font-black flex items-center justify-center text-foreground border border-border">
                            {idx + 1}
                          </span>
                          <span
                            className="absolute top-3 right-3 text-[10px] px-2.5 py-0.5 rounded-full font-bold border font-mono"
                            style={{
                              color: accent,
                              borderColor: `${accent}40`,
                              background: `${accent}0b`,
                            }}
                          >
                            ★ {run.average}
                          </span>
                          
                          {/* Ambient glow on hover */}
                          <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{ background: `radial-gradient(circle at 50% 50%, ${accent}06, transparent 75%)` }}
                          />

                          <div
                            className="w-[85%] h-[85%] flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
                            dangerouslySetInnerHTML={{ __html: run.svg }}
                          />
                        </div>
                        <div className="p-4 bg-surface-elevated/70 border-t border-border flex flex-col justify-between flex-1 space-y-3">
                          <div>
                            <div className="font-bold text-[14px] truncate text-foreground group-hover:text-primary-muted transition-colors">
                              {p?.displayName || run.provider}
                            </div>
                            <div className="text-[10px] text-foreground-subtle font-mono truncate mt-0.5">
                              {run.model_id}
                            </div>
                          </div>
                          <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between text-[10px] text-foreground-muted">
                            <span className="flex items-center gap-1 font-semibold truncate text-foreground-muted">
                              <User className="w-3.5 h-3.5 text-foreground-faint shrink-0" />
                              {run.creator_name}
                            </span>
                            <span className="shrink-0 font-mono text-foreground-faint">{formatDate(run.created_at)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
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
            className="space-y-6"
          >
            <div className="border-b border-border pb-4">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-foreground-muted flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-purple" /> Flagship Showcase Gallery
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
                    className="card overflow-hidden flex flex-col bg-surface group transition-all duration-300 hover:shadow-lg"
                    style={{ borderColor: `${accent}25` }}
                  >
                    <div className="p-4 bg-surface-elevated/70 border-b border-border flex items-center justify-between">
                      <div>
                        <div className="font-display font-bold text-sm text-foreground group-hover:text-primary-muted transition-colors">{r.name}</div>
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
                      style={{ background: 'radial-gradient(circle, rgba(250,245,255,0.4) 0%, rgba(255,255,255,1) 100%)' }}
                    >
                      {/* Ambient card glow */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: `radial-gradient(circle at 50% 50%, ${accent}06, transparent 75%)` }}
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
              className="bg-surface rounded-2xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative z-10"
            >
              <button
                onClick={() => setSelectedRun(null)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-border hover:bg-surface-hover text-foreground-muted hover:text-foreground z-25 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Panel: SVG Render */}
                <div 
                  className="aspect-square flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-border relative overflow-hidden"
                  style={{ background: 'radial-gradient(circle, #fcfaff 0%, #ffffff 100%)' }}
                >
                  <div
                    className="w-[90%] h-[90%] flex items-center justify-center relative z-10"
                    dangerouslySetInnerHTML={{ __html: selectedRun.svg }}
                  />
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#e0d5fa_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                </div>

                {/* Right Panel: Scoring & Metadata */}
                <div className="p-8 flex flex-col justify-between h-full space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider font-mono"
                        style={{
                          color: providers.find(p => p.id === selectedRun.provider)?.accent || '#ff2d9b',
                          borderColor: `${providers.find(p => p.id === selectedRun.provider)?.accent}40` || '#ff2d9b40',
                          background: `${providers.find(p => p.id === selectedRun.provider)?.accent}0b` || '#ff2d9b0b'
                        }}
                      >
                        {selectedRun.provider}
                      </span>
                      <span className="text-sm font-bold text-foreground font-display">Score: {selectedRun.average}/100</span>
                    </div>
                    
                    <h2 className="text-2xl font-display font-extrabold text-foreground mt-3 leading-tight">
                      {providers.find(p => p.id === selectedRun.provider)?.displayName || selectedRun.provider}
                    </h2>
                    <p className="text-xs text-foreground-subtle font-mono mt-1">
                      Model ID: {selectedRun.model_id}
                    </p>

                    <div className="mt-6 space-y-4">
                      <ScoreBar label="Complexity (Element count)" value={selectedRun.scores.complexity} accent="#ff2d9b" />
                      <ScoreBar label="Palette (Color count)" value={selectedRun.scores.palette} accent="#7c2fff" />
                      <ScoreBar label="Anatomy (Required markers)" value={selectedRun.scores.anatomy} accent="#0099cc" />
                      <ScoreBar label="Craft (Payload weight)" value={selectedRun.scores.craft} accent="#e0007a" />
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
      className="card overflow-hidden flex flex-col group relative bg-surface border-border transition-all duration-300 hover:scale-[1.015] hover:border-border-strong hover:shadow-md"
      style={{
        borderColor: isOk ? `${accent}55` : undefined,
        boxShadow: isOk ? `0 4px 20px ${accent}0d` : undefined,
      }}
    >
      {/* Ambient card glow on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% -20%, ${accent}0a, transparent 65%)` }}
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
            <span className="text-sm font-extrabold font-mono" style={{ color: accent }}>
              ★ {result.average}
            </span>
          )}
        </div>
      </header>

      <div
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden border-b border-border"
        style={{ background: 'radial-gradient(circle, rgba(250,245,255,0.4) 0%, rgba(255,255,255,1) 100%)' }}
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
            <div className="text-4xl opacity-30 animate-pulse">🤖</div>
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            style={{
              background: provider.available
                ? `linear-gradient(135deg, ${accent}, ${accent}dd)`
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
          <div className="w-full text-center py-2.5 px-4 rounded-xl border border-dashed border-border text-[11px] text-foreground-faint bg-surface-soft font-mono">
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
            background: `linear-gradient(90deg, ${accent}, #7c2fff)`,
          }}
        />
      </div>
    </div>
  );
}
