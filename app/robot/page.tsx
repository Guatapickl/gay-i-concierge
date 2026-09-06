"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Award, Check, Clock, RefreshCw, TrendingUp } from 'lucide-react';
import { Alert, Button, LoadingSpinner } from '@/components/ui';
import { authHeader, currentUser } from '@/lib/firebase/authClient';
import { sortRobotShowcase, type RobotShowcaseSort, type RobotVoteSummary } from '@/lib/robot-showcase';
import { robots } from './registry';

export default function RobotShowcasePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<RobotVoteSummary[] | null>(null);
  const [sort, setSort] = useState<RobotShowcaseSort>('newest');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const user = await currentUser();
      setUserId(user?.uid ?? null);
      if (!user) { setVotes(null); return; }
      const response = await fetch('/api/robot/votes', { headers: await authHeader(), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the saved votes.');
      if (!Array.isArray(data.votes)) throw new Error('Could not load the saved votes.');
      setVotes(data.votes);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load the saved votes.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const orderedRobots = useMemo(() => sortRobotShowcase(robots, sort, votes ?? []), [sort, votes]);
  const voteById = useMemo(() => new Map((votes ?? []).map(vote => [vote.robotId, vote])), [votes]);
  const saveVote = async (robotId: string) => {
    if (busy.current || loading || !userId || votes === null) return;
    busy.current = true;
    setSavingId(robotId);
    setError(null);
    setNotice('');
    const voted = !voteById.get(robotId)?.votedByMe;
    try {
      const response = await fetch('/api/robot/votes', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ robotId, voted }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your vote. Please try again.');
      if (!Array.isArray(data.votes)) throw new Error('Could not confirm your saved vote. Refresh the votes and try again.');
      setVotes(data.votes);
      const name = robots.find(robot => robot.id === robotId)?.name ?? 'this robot';
      setNotice(voted ? `Your vote for ${name} is saved.` : `Your vote for ${name} was removed.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save your vote. Please try again.');
    } finally {
      busy.current = false;
      setSavingId(null);
    }
  };

  if (loading && !userId) return <LoadingSpinner text="Loading showcase…" className="mt-8" />;
  if (!userId) return (
    <div className="card p-8 text-center max-w-md mx-auto">
      <Award className="w-8 h-8 mx-auto text-primary mb-3" />
      <h1 className="font-display text-xl font-bold text-foreground">Flagship Showcase</h1>
      <p className="text-sm text-foreground-muted mt-2 mb-4">Sign in to explore the robots and save your favorites.</p>
      {error && <Alert variant="error">{error}</Alert>}
      <Link href="/auth/sign-in" className="btn-brand inline-flex text-sm">Sign in</Link>
    </div>
  );
  const disabled = loading || savingId !== null;
  return (
    <div className="min-w-0 w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <header className="card p-6 md:p-8 space-y-3">
        <div className="flex items-center gap-2 text-primary text-xs font-mono uppercase tracking-wider"><Award className="w-4 h-4" /> Robot gallery</div>
        <h1 className="page-heading">Flagship Showcase</h1>
        <p className="text-sm text-foreground-muted max-w-2xl">Original robot artworks. Explore the details and vote for your favorites.</p>
        <p className="text-sm text-foreground-muted">You can vote for more than one robot. Each vote is saved to your account; select “Voted” to remove it whenever you change your mind.</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sort robots">
          <span className="text-xs font-semibold text-foreground-muted mr-1">Sort by</span>
          <Button variant={sort === 'newest' ? 'primary' : 'secondary'} aria-pressed={sort === 'newest'} onClick={() => setSort('newest')} disabled={disabled}>
            <Clock className="w-4 h-4" /> Newest
          </Button>
          <Button variant={sort === 'top-voted' ? 'primary' : 'secondary'} aria-pressed={sort === 'top-voted'} onClick={() => setSort('top-voted')} disabled={disabled || votes === null}>
            <TrendingUp className="w-4 h-4" /> Top voted
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={disabled} aria-label="Refresh saved votes">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading votes…' : 'Refresh votes'}
        </Button>
      </div>
      <p className="text-xs text-foreground-muted">{sort === 'newest' ? 'Newest additions first.' : 'Most votes first. Equal totals are shown newest first.'}</p>
      {error && <Alert variant="error">{error} Your previously displayed votes are unchanged.</Alert>}
      <p role="status" aria-live="polite" className="text-sm text-primary min-h-5">{notice}</p>
      {!loading && votes !== null && votes.every(vote => vote.count === 0) && <p className="text-sm text-foreground-muted">No votes yet. Be the first to choose a favorite.</p>}
      {orderedRobots.length === 0 ? <div className="card p-8 text-foreground-muted">No showcase robots have been added yet.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orderedRobots.map((robot, index) => {
            const Artwork = robot.component;
            const vote = voteById.get(robot.id);
            const voted = vote?.votedByMe ?? false;
            return (
              <article key={robot.id} className="card min-w-0 overflow-hidden flex flex-col group" aria-labelledby={`robot-${robot.id}`}>
                <header className="p-4 bg-surface-elevated/70 border-b border-border space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id={`robot-${robot.id}`} className="font-display font-bold text-foreground">{robot.name}</h2>
                    {sort === 'top-voted' && <span className="badge badge-cyan shrink-0" aria-label={`Position ${index + 1}`}>#{index + 1}</span>}
                  </div>
                  <p className="text-xs font-mono text-foreground-muted">{robot.model}</p>
                  <p className="text-[11px] text-foreground-faint">Added <time dateTime={robot.addedAt}>{new Date(robot.addedAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</time></p>
                </header>
                <div className="aspect-square flex items-center justify-center p-8 bg-surface-elevated border-b border-border overflow-hidden">
                  <div className="w-[85%] h-[85%] flex items-center justify-center"><Artwork className="w-full h-full max-h-full" /></div>
                </div>
                <footer className="p-4 flex flex-wrap items-center justify-between gap-3 mt-auto">
                  <span className="text-sm text-foreground-muted" aria-label={`${votes === null ? 'Votes unavailable' : `${vote?.count ?? 0} votes`}`}>
                    <span className="font-mono font-bold text-foreground">{votes === null ? '—' : vote?.count ?? 0}</span> {vote?.count === 1 ? 'vote' : 'votes'}
                  </span>
                  <Button variant={voted ? 'primary' : 'secondary'} aria-pressed={voted} aria-label={voted ? `Remove your vote for ${robot.name}` : `Vote for ${robot.name}`} disabled={disabled || votes === null} onClick={() => void saveVote(robot.id)}>
                    {voted ? <Check className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    {savingId === robot.id ? 'Saving…' : voted ? 'Voted' : 'Vote'}
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
