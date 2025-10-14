"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  const [experience, setExperience] = useState<'none'|'beginner'|'intermediate'|'advanced'>('none');

  // Interests
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  // Alerts
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);

  const canSave = useMemo(() => !!userId, [userId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { router.replace('/auth/sign-in'); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? null);

      // Load profile (auth-coupled user profile)
      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('full_name, phone, experience_level, interests')
        .eq('id', user.id)
        .maybeSingle();
      if (profileRow) {
        setFullName(profileRow.full_name ?? '');
        setPhone(profileRow.phone ?? '');
        setExperience((profileRow.experience_level ?? 'none') as any);
        setSelectedInterests(profileRow.interests ?? []);
      }

      // Load suggestions for interests (optional)
      const { data: interests } = await supabase
        .from('interests')
        .select('id, name')
        .order('name');
      setAllInterests((interests || []) as Interest[]);

      // Alerts status
      // We treat email/phone as independent channels.
      const emailVal = user.email ?? null;
      if (emailVal) {
        const { data: sub } = await supabase
          .from('alerts_subscribers')
          .select('email_opt_in')
          .eq('email', emailVal)
          .maybeSingle();
        if (sub) setEmailOptIn(!!sub.email_opt_in);
      }
      if (profileRow?.phone) {
        const { data: sub } = await supabase
          .from('alerts_subscribers')
          .select('sms_opt_in')
          .eq('phone', profileRow.phone)
          .maybeSingle();
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
      const { error: upErr } = await supabase.from('user_profiles').upsert({
        id: userId,
        full_name: fullName || null,
        phone: phone || null,
        experience_level: experience,
        interests: selectedInterests,
        email: userEmail, // keep in sync for convenience
      }, { onConflict: 'id' });
      if (upErr) throw upErr;

      // Sync alerts subscribers
      // Email
      if (userEmail) {
        if (emailOptIn) {
          await fetch('/api/alerts/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, channels: ['email'] }) });
        } else {
          await fetch('/api/alerts/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail, channels: ['email'] }) });
        }
      }
      // SMS
      if (phone) {
        if (smsOptIn) {
          await fetch('/api/alerts/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, channels: ['sms'] }) });
        } else {
          await fetch('/api/alerts/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, channels: ['sms'] }) });
        }
      }

      // Visual confirmation
      alert('Profile saved');
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-md mx-auto">Loading profile…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
      {error && <div className="mb-3 text-sm text-rose-400">{error}</div>}
      <form onSubmit={saveProfile} className="space-y-6">
        <section>
          <h3 className="font-semibold mb-2">Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input className="w-full border px-3 py-2 rounded" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input className="w-full border px-3 py-2 rounded" placeholder="+15551234567" value={phone} onChange={e => setPhone(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">Use E.164 format, e.g., +15551234567.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Email</label>
              <input className="w-full border px-3 py-2 rounded bg-gray-100" value={userEmail ?? ''} disabled />
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Experience Level</h3>
          <select className="border px-3 py-2 rounded" value={experience} onChange={e => setExperience(e.target.value as any)}>
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
              <input className="flex-1 border px-3 py-2 rounded" placeholder="Add new interest" value={newInterest} onChange={e => setNewInterest(e.target.value)} />
              <button type="button" className="border px-3 py-2 rounded" onClick={addNewInterest}>Add</button>
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

        <button type="submit" disabled={!canSave || saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
