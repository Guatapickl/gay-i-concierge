"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button, FormInput, Alert } from '@/components/ui';

export default function SignInPage() {
  const router = useRouter();
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
      else {
        setMessage('Signed in!');
        router.push('/hub');
      }
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
    } catch {
      setMessage('Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full max-w-[350px] mx-auto bg-black/40 p-6 rounded-lg border border-white/10 shadow-[0_0_20px_rgba(255,0,204,0.1)] backdrop-blur-sm">
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
        <div className="text-right text-sm text-gray-400">
          <a className="underline" href="/auth/forgot">Forgot password?</a>
        </div>
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

      <Button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        variant="secondary"
        fullWidth
        className="flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? 'Signing in…' : 'Sign in with Google'}
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
