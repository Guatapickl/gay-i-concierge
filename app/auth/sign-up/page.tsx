"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, FormInput, Alert } from '@/components/ui';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 6) { setMessage('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Check your email to confirm your account.');
        setTimeout(() => router.replace('/'), 1200);
      }
    } catch {
      setMessage('Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create Account</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <FormInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <FormInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <FormInput
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          required
        />
        <Button type="submit" disabled={loading} variant="primary" fullWidth>
          {loading ? 'Signing up…' : 'Sign Up'}
        </Button>
      </form>
      {message && (
        <Alert
          variant={message.includes('Check your email') ? 'success' : 'error'}
          className="mt-4"
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}
    </div>
  );
}

