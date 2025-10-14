"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
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
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border px-3 py-2 rounded"
          required
        />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <div className="my-4 text-center text-sm text-gray-500">or</div>
      <form onSubmit={sendMagicLink} className="space-y-3 mb-4">
        <button type="submit" disabled={loading} className="w-full bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Sending…' : 'Send Magic Link'}
        </button>
      </form>
      <button onClick={signInWithGoogle} disabled={loading} className="w-full bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-50">
        Continue with Google
      </button>
      <div className="mt-4 text-sm text-gray-500 text-center">
        New here? <a href="/auth/sign-up" className="underline">Create an account</a>
      </div>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </div>
  );
}
