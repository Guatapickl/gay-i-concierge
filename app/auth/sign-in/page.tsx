"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, FormInput, Alert } from '@/components/ui';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) setMessage(error.message);
      else setMessage('Check your email for a sign-in link.');
    } catch {
      setMessage('Failed to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setMessage(error.message);
      else setMessage('Signed in!');
    } catch {
      setMessage('Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-4">Sign In</h2>
      <form onSubmit={signInWithPassword} className="space-y-3">
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
        <Button type="submit" disabled={loading} variant="primary" fullWidth>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
      <div className="my-4 text-center text-sm text-gray-500">or</div>
      <form onSubmit={sendMagicLink} className="space-y-3 mb-4">
        <Button type="submit" disabled={loading} variant="secondary" fullWidth>
          {loading ? 'Sending…' : 'Send Magic Link'}
        </Button>
      </form>
      <Button onClick={signInWithGoogle} disabled={loading} variant="ghost" fullWidth>
        Continue with Google
      </Button>
      <div className="mt-4 text-sm text-gray-500 text-center">
        New here? <a href="/auth/sign-up" className="underline">Create an account</a>
      </div>
      {message && (
        <Alert
          variant={message.includes('Signed in') || message.includes('Check your email') ? 'success' : 'error'}
          className="mt-4"
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}
    </div>
  );
}
