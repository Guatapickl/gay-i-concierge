"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completePasswordReset } from '@/lib/firebase/authClient';
import { Button, FormInput, Alert } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'verifying' | 'ready' | 'done' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying reset link…');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const mode = url.searchParams.get('mode');
      const code = url.searchParams.get('oobCode');
      if (!code || (mode && mode !== 'resetPassword')) {
        setMessage('Invalid reset URL.');
        setPhase('error');
        return;
      }
      setOobCode(code);
      setPhase('ready');
      setMessage('');
    } catch {
      setMessage('Reset failed.');
      setPhase('error');
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    if (!oobCode) {
      setMessage('Invalid reset URL.');
      setPhase('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await completePasswordReset(oobCode, password);
      setPhase('done');
      setMessage('Password updated. Redirecting…');
      setTimeout(() => router.replace('/auth/sign-in'), 800);
    } catch (err) {
      setMessage(`Could not update password: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-4">Set a new password</h2>
      {phase === 'verifying' && (
        <p>{message}</p>
      )}
      {phase === 'ready' && (
        <form onSubmit={onSubmit} className="space-y-3">
          <FormInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={8}
            required
          />
          <FormInput
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            minLength={8}
            required
          />
          <Button type="submit" disabled={loading} variant="primary" fullWidth>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
          {message && <Alert variant="error">{message}</Alert>}
        </form>
      )}
      {phase === 'error' && (
        <Alert variant="error" className="mt-4">{message}</Alert>
      )}
      {phase === 'done' && (
        <Alert variant="success" className="mt-4">{message}</Alert>
      )}
    </div>
  );
}

