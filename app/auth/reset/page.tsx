"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, FormInput, Alert } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'verifying' | 'ready' | 'done' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying reset link…');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        const url = new URL(href);
        const error_description = url.searchParams.get('error_description');
        if (error_description) {
          setMessage(`Reset failed: ${error_description}`);
          setPhase('error');
          return;
        }

        // 1) Try code-based exchange (recovery can also use code)
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) {
            setMessage(`Reset failed: ${error.message}`);
            setPhase('error');
            return;
          }
          if (data?.session) {
            setPhase('ready');
            setMessage('');
            return;
          }
        }

        // 2) Try token_hash verifyOtp for recovery
        const token_hash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type') as
          | 'signup'
          | 'magiclink'
          | 'recovery'
          | 'email_change'
          | null;
        if (token_hash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) {
            setMessage(`Reset failed: ${error.message}`);
            setPhase('error');
            return;
          }
          setPhase('ready');
          setMessage('');
          return;
        }

        // 3) Try implicit hash flow
        if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token')) {
          const hash = window.location.hash.replace(/^#/, '');
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token') ?? undefined;
          const refresh_token = params.get('refresh_token') ?? undefined;
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              setMessage(`Reset failed: ${error.message}`);
              setPhase('error');
              return;
            }
            if (data?.session) {
              setPhase('ready');
              setMessage('');
              return;
            }
          }
        }

        setMessage('Invalid reset URL.');
        setPhase('error');
      } catch {
        setMessage('Reset failed.');
        setPhase('error');
      }
    })();
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
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(`Could not update password: ${error.message}`);
        return;
      }
      setPhase('done');
      setMessage('Password updated. Redirecting…');
      setTimeout(() => router.replace('/'), 800);
    } catch {
      setMessage('Could not update password.');
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

