"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
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
    <div className="w-full max-w-sm mx-auto">
      <div className="card-elevated p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-display font-semibold text-foreground">
            Create an account
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Join the Gay I Club community
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
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
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-foreground-muted">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-primary hover:text-primary-muted transition-colors">
            Sign in
          </Link>
        </p>

        {message && (
          <Alert
            variant={message.includes('Check your email') ? 'success' : 'error'}
            onClose={() => setMessage(null)}
          >
            {message}
          </Alert>
        )}
      </div>
    </div>
  );
}
