"use client";

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Users, Sparkles, ArrowRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui';
import InviteCard from '@/components/InviteCard';
import type { DirectoryMember } from '@/lib/directory';

const EXPERIENCE_LABELS: Record<string, { label: string; color: string }> = {
  none: { label: 'New to AI', color: '#a8a29e' },
  beginner: { label: 'Beginner', color: '#0099cc' },
  intermediate: { label: 'Intermediate', color: '#7c2fff' },
  advanced: { label: 'Advanced', color: '#ff2d9b' },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hashColor(id: string): string {
  const colors = [
    'linear-gradient(135deg, #ff2d9b, #7c2fff)',
    'linear-gradient(135deg, #7c2fff, #0099cc)',
    'linear-gradient(135deg, #0099cc, #00cc88)',
    'linear-gradient(135deg, #ff2d9b, #ff6b35)',
    'linear-gradient(135deg, #7c3aed, #ec4899)',
    'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #10b981, #3b82f6)',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function CommunityPage() {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExperience, setFilterExperience] = useState<string>('all');
  const [filterInterest, setFilterInterest] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      // Check auth
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setLoading(false);
        return;
      }

      // Fetch all member profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, experience_level, interests, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching directory:', error.message);
      }
      setMembers((data || []) as DirectoryMember[]);
      setLoading(false);
    })();
  }, []);

  // Collect all unique interests across members
  const allInterests = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => m.interests?.forEach(i => set.add(i)));
    return Array.from(set).sort();
  }, [members]);

  // Filtered members
  const filtered = useMemo(() => {
    return members.filter(m => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = m.full_name?.toLowerCase().includes(q);
        const interestMatch = m.interests?.some(i => i.toLowerCase().includes(q));
        if (!nameMatch && !interestMatch) return false;
      }
      // Experience filter
      if (filterExperience !== 'all' && m.experience_level !== filterExperience) {
        return false;
      }
      // Interest filter
      if (filterInterest !== 'all' && !m.interests?.includes(filterInterest)) {
        return false;
      }
      return true;
    });
  }, [members, searchQuery, filterExperience, filterInterest]);

  if (loading) {
    return <LoadingSpinner text="Loading community..." className="py-12" />;
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Hero header */}
      <div className="card-tinted p-6 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,47,255,0.18), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-purple">
              <Users className="w-3 h-3" />
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-foreground mb-1.5 tracking-tight">
            Member Directory
          </h2>
          <p className="text-foreground-muted max-w-xl">
            Connect with fellow members of the Gay I Club community. Browse profiles,
            discover shared interests, and find your next AI collaborator.
          </p>
        </div>
      </div>

      {/* Search & Filters bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or interest..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field w-full pl-10 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all border ${
              showFilters || filterExperience !== 'all' || filterInterest !== 'all'
                ? 'bg-surface-soft border-primary text-primary-muted'
                : 'bg-surface border-border text-foreground-muted hover:border-border-strong hover:text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterExperience !== 'all' || filterInterest !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-primary animate-scale-in" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="card p-4 flex flex-wrap gap-4 animate-slide-up">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground-faint tracking-wide uppercase font-mono">
                Experience
              </label>
              <select
                className="input-field text-sm min-w-[160px]"
                value={filterExperience}
                onChange={e => setFilterExperience(e.target.value)}
              >
                <option value="all">All levels</option>
                {Object.entries(EXPERIENCE_LABELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground-faint tracking-wide uppercase font-mono">
                Interest
              </label>
              <select
                className="input-field text-sm min-w-[160px]"
                value={filterInterest}
                onChange={e => setFilterInterest(e.target.value)}
              >
                <option value="all">All interests</option>
                {allInterests.map(interest => (
                  <option key={interest} value={interest}>{interest}</option>
                ))}
              </select>
            </div>

            {(filterExperience !== 'all' || filterInterest !== 'all') && (
              <button
                onClick={() => { setFilterExperience('all'); setFilterInterest('all'); }}
                className="self-end text-xs text-primary-muted hover:text-primary transition-colors font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || filterExperience !== 'all' || filterInterest !== 'all') && (
        <p className="text-sm text-foreground-muted">
          Showing <span className="font-bold text-foreground">{filtered.length}</span>{' '}
          of {members.length} members
        </p>
      )}

      {/* Members grid */}
      {filtered.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-foreground-muted font-medium">No members found</p>
          <p className="text-sm text-foreground-subtle mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filtered.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}

      {/* Invite section */}
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-base font-display font-bold text-foreground">Grow the Community</h3>
        </div>
        <p className="text-sm text-foreground-muted mb-4">
          Know someone who&apos;d love to explore AI with us? Generate a personalized invite.
        </p>
        <InviteCard />
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: DirectoryMember }) {
  const initials = getInitials(member.full_name);
  const avatarBg = hashColor(member.id);
  const exp = EXPERIENCE_LABELS[member.experience_level ?? 'none'] ?? EXPERIENCE_LABELS.none;
  const joinDate = new Date(member.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });

  return (
    <Link
      href={`/community/${member.id}`}
      className="group card p-5 flex flex-col hover:border-border-strong transition-all"
    >
      <div className="flex items-start gap-3.5 mb-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-display font-bold text-sm shrink-0 shadow-soft group-hover:scale-105 transition-transform"
          style={{ background: avatarBg }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary-muted transition-colors">
              {member.full_name || 'Anonymous Member'}
            </h3>
            <ArrowRight className="w-3.5 h-3.5 text-foreground-faint opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[11px] font-bold font-mono tracking-wide"
              style={{ color: exp.color }}
            >
              {exp.label}
            </span>
            <span className="text-foreground-faint text-[11px]">·</span>
            <span className="text-foreground-faint text-[11px] font-mono">
              Joined {joinDate}
            </span>
          </div>
        </div>
      </div>

      {/* Interests */}
      {member.interests && member.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {member.interests.slice(0, 4).map(interest => (
            <span key={interest} className="badge text-[10px]">
              {interest}
            </span>
          ))}
          {member.interests.length > 4 && (
            <span className="badge text-[10px] text-foreground-faint">
              +{member.interests.length - 4}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
