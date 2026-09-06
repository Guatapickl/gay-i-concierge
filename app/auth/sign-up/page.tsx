"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithPassword } from '@/lib/firebase/authClient';
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
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithPassword(email.trim(), password);
      setMessage('Check your email to confirm your account.');
      setTimeout(() => { router.replace('/'); router.refresh(); }, 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sign up failed.');
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
            Join the Gay I Club community · Adults 18+
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
            placeholder="Password (8+ characters)"
            minLength={8}
            required
          />
          <FormInput
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            required
          />
          <p className="text-xs text-foreground-muted">By creating an account, you confirm you are 18 or older and agree to the <Link className="underline" href="/terms-of-use">Terms of Use</Link>. Read our <Link className="underline" href="/privacy-policy">Privacy Policy</Link> to understand how your information is used.</p>
          <Button type="submit" disabled={loading} variant="primary" fullWidth>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-foreground-muted">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-primary underline underline-offset-4 hover:text-primary-muted transition-colors">
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
