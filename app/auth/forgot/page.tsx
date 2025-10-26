"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, FormInput, Alert } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/reset` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) setMessage(error.message);
      else setMessage('If that email exists, a reset link is on its way.');
    } catch {
      setMessage('Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-4">Reset your password</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <FormInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Button type="submit" disabled={loading} variant="primary" fullWidth>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      {message && (
        <Alert
          variant={message.includes('reset link') ? 'info' : 'error'}
          className="mt-4"
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}
    </div>
  );
}

