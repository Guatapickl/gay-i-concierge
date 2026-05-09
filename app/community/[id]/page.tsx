"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Zap,
  User,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui';
import type { DirectoryMember } from '@/lib/directory';

const EXPERIENCE_CONFIG: Record<string, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  none: {
    label: 'New to AI',
    description: 'Just getting started on the AI journey',
    color: '#a8a29e',
    icon: <Sparkles className="w-4 h-4" />,
  },
  beginner: {
    label: 'Beginner',
    description: 'Exploring the fundamentals of AI & ML',
    color: '#0099cc',
    icon: <Zap className="w-4 h-4" />,
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Building projects and diving deeper into AI',
    color: '#7c2fff',
    icon: <Zap className="w-4 h-4" />,
  },
  advanced: {
    label: 'Advanced',
    description: 'Pushing the frontier of AI technology',
    color: '#ff2d9b',
    icon: <Sparkles className="w-4 h-4" />,
  },
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

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;

  const [member, setMember] = useState<DirectoryMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    if (!memberId) return;

    (async () => {
      // Check auth
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.replace('/auth/sign-in');
        return;
      }

      setIsOwnProfile(authData.user.id === memberId);

      // Fetch member profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, experience_level, interests, created_at')
        .eq('id', memberId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching member:', error.message);
      }

      setMember(data as DirectoryMember | null);
      setLoading(false);
    })();
  }, [memberId, router]);

  if (loading) {
    return <LoadingSpinner text="Loading profile..." className="py-12" />;
  }

  if (!member) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to directory
        </Link>
        <div className="card-elevated p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-foreground-muted font-medium">Member not found</p>
          <p className="text-sm text-foreground-subtle mt-1">
            This profile may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const initials = getInitials(member.full_name);
  const avatarBg = hashColor(member.id);
  const exp = EXPERIENCE_CONFIG[member.experience_level ?? 'none'] ?? EXPERIENCE_CONFIG.none;
  const joinDate = new Date(member.created_at);
  const joinFormatted = joinDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const memberSince = joinDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/community"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </Link>

      {/* Profile hero card */}
      <div className="card-tinted p-8 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div
          className="absolute -top-32 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,45,155,0.15), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,47,255,0.12), transparent 70%)' }}
        />

        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Large avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl shrink-0 shadow-medium"
              style={{ background: avatarBg }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-display-md font-display text-foreground">
                    {member.full_name || 'Anonymous Member'}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span
                      className="badge gap-1.5"
                      style={{
                        color: exp.color,
                        borderColor: `${exp.color}66`,
                        background: `${exp.color}12`,
                      }}
                    >
                      {exp.icon}
                      {exp.label}
                    </span>
                    <span className="badge">
                      <Calendar className="w-3 h-3" />
                      Member since {memberSince}
                    </span>
                  </div>
                </div>

                {isOwnProfile && (
                  <Link
                    href="/profile"
                    className="btn-brand text-sm inline-flex items-center gap-2 shrink-0"
                  >
                    <User className="w-4 h-4" />
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Experience card */}
        <div className="card-elevated p-5">
          <h2 className="text-xs font-bold text-foreground-faint tracking-[0.12em] uppercase mb-4 font-mono">
            AI Experience
          </h2>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `${exp.color}15`,
                border: `1.5px solid ${exp.color}33`,
                color: exp.color,
              }}
            >
              {exp.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{exp.label}</p>
              <p className="text-xs text-foreground-muted">{exp.description}</p>
            </div>
          </div>
          {/* Experience bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-mono text-foreground-faint mb-1.5">
              <span>New</span>
              <span>Advanced</span>
            </div>
            <div className="h-2 bg-surface-elevated rounded-full overflow-hidden border border-border-subtle">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:
                    member.experience_level === 'advanced' ? '100%'
                    : member.experience_level === 'intermediate' ? '66%'
                    : member.experience_level === 'beginner' ? '33%'
                    : '8%',
                  background: `linear-gradient(90deg, ${exp.color}88, ${exp.color})`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Member since card */}
        <div className="card-elevated p-5">
          <h2 className="text-xs font-bold text-foreground-faint tracking-[0.12em] uppercase mb-4 font-mono">
            Membership
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-elevated border border-border text-foreground-muted">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Joined {joinFormatted}
              </p>
              <p className="text-xs text-foreground-muted">
                {daysSince(joinDate)} days in the community
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interests section */}
      {member.interests && member.interests.length > 0 && (
        <div className="card-elevated p-5">
          <h2 className="text-xs font-bold text-foreground-faint tracking-[0.12em] uppercase mb-4 font-mono flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Interests & Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {member.interests.map(interest => (
              <Link
                key={interest}
                href={`/community?interest=${encodeURIComponent(interest)}`}
                className="group badge text-sm px-3 py-1.5 hover:border-primary hover:text-primary-muted hover:bg-surface-soft transition-all"
              >
                {interest}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no interests */}
      {(!member.interests || member.interests.length === 0) && (
        <div className="card p-6 text-center">
          <p className="text-foreground-muted text-sm">
            This member hasn&apos;t added any interests yet.
          </p>
        </div>
      )}
    </div>
  );
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
