"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { currentUser, providerIds, setPassword } from '@/lib/firebase/authClient';
import { getRow, listRows, nowIso, payloadOf, ref } from '@/lib/firebase/db';
import { limit, orderBy, setDoc, where } from 'firebase/firestore';
import { Button, FormInput, Alert, LoadingSpinner } from '@/components/ui';
import MyRsvps from '@/components/MyRsvps';
// Simple suggestion list pulling from `interests` table if present
type Interest = { id: string; name: string };

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  type ExperienceLevel = 'none' | 'beginner' | 'intermediate' | 'advanced';
  const [experience, setExperience] = useState<ExperienceLevel>('none');

  // Interests
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  // Security
  const [providers, setProviders] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Alerts
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  const canSave = useMemo(() => !!userId, [userId]);

  useEffect(() => {
    (async () => {
      const user = await currentUser();
      if (!user) { router.replace('/auth/sign-in'); return; }
      setUserId(user.uid);
      setUserEmail(user.email ?? null);
      const provs = providerIds(user).filter(Boolean);
      setProviders(provs.length ? provs : ['password']);

      // Load profile (auth-coupled user profile)
      const profileRow = await getRow<{
        full_name?: string | null;
        phone?: string | null;
        experience_level?: string | null;
        interests?: string[] | null;
      }>('user_profiles', user.uid).catch(() => null);
      if (profileRow) {
        setFullName(profileRow.full_name ?? '');
        setPhone(profileRow.phone ?? '');
        const expVals = ['none','beginner','intermediate','advanced'] as const;
        const raw = (profileRow.experience_level ?? 'none') as string;
        const nextExp: ExperienceLevel = (expVals as readonly string[]).includes(raw) ? (raw as ExperienceLevel) : 'none';
        setExperience(nextExp);
        setSelectedInterests(profileRow.interests ?? []);
      }

      // Load suggestions for interests (optional)
      const interests = await listRows<Interest>('interests', orderBy('name')).catch(() => [] as Interest[]);
      setAllInterests(interests);

      // Alerts status
      // We treat email/phone as independent channels.
      const emailVal = user.email ?? null;
      if (emailVal) {
        const [sub] = await listRows<{ email_opt_in?: boolean }>(
          'alerts_subscribers', where('email', '==', emailVal), limit(1),
        ).catch(() => []);
        if (sub) setEmailOptIn(!!sub.email_opt_in);
      }
      if (profileRow?.phone) {
        const [sub] = await listRows<{ sms_opt_in?: boolean }>(
          'alerts_subscribers', where('phone', '==', profileRow.phone), limit(1),
        ).catch(() => []);
        if (sub) setSmsOptIn(!!sub.sms_opt_in);
      }

      setLoading(false);
    })();
  }, [router]);

  const toggleInterestName = (name: string) => {
    setSelectedInterests((prev) => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const addNewInterest = async () => {
    const trimmed = newInterest.trim();
    if (!trimmed) return;
    setSelectedInterests((prev) => Array.from(new Set([...prev, trimmed])));
    setNewInterest('');
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      // Upsert user profile
      await setDoc(ref('user_profiles', userId), payloadOf({
        id: userId,
        full_name: fullName || null,
        phone: phone || null,
        experience_level: experience,
        interests: selectedInterests,
        email: userEmail, // keep in sync for convenience
        updated_at: nowIso(),
      }), { merge: true });

      // Sync alerts subscribers
      // Email
      if (userEmail) {
        if (emailOptIn) {
          await fetch('/api/alerts/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, channels: ['email'], user_id: userId }) });
        } else {
          await fetch('/api/alerts/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, channels: ['email'], user_id: userId }) });
        }
      }
      // SMS
      if (phone) {
        if (smsOptIn) {
          await fetch('/api/alerts/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, channels: ['sms'], user_id: userId }) });
        } else {
          await fetch('/api/alerts/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, channels: ['sms'], user_id: userId }) });
        }
      }

      // Visual confirmation
      alert('Profile saved');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
      } finally {
        setSaving(false);
      }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 8) {
      setPwMessage({ text: 'Password must be at least 8 characters.', ok: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ text: 'Passwords do not match.', ok: false });
      return;
    }
    setPwSaving(true);
    try {
      await setPassword(newPassword);
    } catch (pwErr) {
      setPwSaving(false);
      setPwMessage({ text: pwErr instanceof Error ? pwErr.message : 'Could not update password.', ok: false });
      return;
    }
    setPwSaving(false);
    setNewPassword('');
    setConfirmPassword('');
    setProviders(prev => (prev.includes('password') ? prev : [...prev, 'password']));
    setPwMessage({ text: 'Password saved. You can now sign in with your email and password.', ok: true });
  };

  if (loading) {
    return <LoadingSpinner text="Loading profile..." className="mt-8" />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
      {error && (
        <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <form onSubmit={saveProfile} className="space-y-6">
        <section>
          <h3 className="font-semibold mb-2">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <FormInput value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <FormInput placeholder="+15551234567" value={phone} onChange={e => setPhone(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Use E.164 format, e.g., +15551234567.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Email</label>
              <FormInput value={userEmail ?? ''} disabled className="bg-gray-100" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Experience Level</h3>
          <select
            className="border px-3 py-2 rounded"
            value={experience}
            onChange={e => setExperience(e.target.value as ExperienceLevel)}
          >
            <option value="none">None</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Interests</h3>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              {allInterests.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm border px-2 py-1 rounded">
                  <input type="checkbox" checked={selectedInterests.includes(i.name)} onChange={() => toggleInterestName(i.name)} />
                  {i.name}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <FormInput className="flex-1" placeholder="Add new interest" value={newInterest} onChange={e => setNewInterest(e.target.value)} />
              <Button type="button" variant="outline" onClick={addNewInterest}>Add</Button>
            </div>
            {selectedInterests.length > 0 && (
              <div className="text-xs text-gray-400">Selected: {selectedInterests.join(', ')}</div>
            )}
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Communications</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)} /> Email updates</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={smsOptIn} onChange={e => setSmsOptIn(e.target.checked)} /> SMS updates</label>
            <p className="text-xs text-gray-500">Toggles use your saved email/phone to manage alert subscriptions.</p>
          </div>
        </section>

        <Button type="submit" disabled={!canSave || saving} variant="primary">
          {saving ? 'Saving…' : 'Save Profile'}
        </Button>
      </form>

      <section className="mt-8 card p-5 space-y-3">
        <h3 className="font-semibold">Sign-in &amp; password</h3>
        <p className="text-xs text-foreground-muted">
          You currently sign in with: {providers.map(pv => (pv === 'password' ? 'email + password / magic link' : pv === 'emailLink' ? 'magic link' : pv === 'google.com' ? 'google' : pv)).join(', ')}.
          {!providers.includes('password') && ' Set a password below to also sign in without Google or a magic link.'}
        </p>
        <form onSubmit={savePassword} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormInput
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="New password (8+ characters)"
            minLength={8}
            autoComplete="new-password"
          />
          <FormInput
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={8}
            autoComplete="new-password"
          />
          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" variant="outline" disabled={pwSaving || !newPassword}>
              {pwSaving ? 'Saving…' : providers.includes('password') ? 'Change password' : 'Set password'}
            </Button>
            {pwMessage && (
              <span className={`text-sm ${pwMessage.ok ? 'text-success' : 'text-danger'}`}>{pwMessage.text}</span>
            )}
          </div>
        </form>
      </section>

      <div className="mt-8">
        <MyRsvps />
      </div>
    </div>
  );
}
