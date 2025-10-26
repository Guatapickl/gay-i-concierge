"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        const url = new URL(href);
        const error_description = url.searchParams.get('error_description');
        if (error_description) {
          setMessage(`Sign-in failed: ${error_description}`);
          return;
        }

        // Prefer the code-based exchange (OAuth PKCE and Magic Link)
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) {
            setMessage(`Sign-in failed: ${error.message}`);
            return;
          }
          if (data?.session) {
            setMessage('Signed in! Redirecting…');
            setTimeout(() => router.replace('/'), 600);
            return;
          }
        }

        // Fallback: verifyOtp flow for links that include token_hash
        const token_hash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type') as
          | 'signup'
          | 'magiclink'
          | 'recovery'
          | 'email_change'
          | null;
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) {
            setMessage(`Sign-in failed: ${error.message}`);
            return;
          }
          setMessage('Signed in! Redirecting…');
          setTimeout(() => router.replace('/'), 600);
          return;
        }

        // Final fallback: implicit (hash) flow e.g. #access_token=...
        if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token')) {
          const { data, error } = await supabase.auth.getSessionFromUrl();
          if (error) {
            setMessage(`Sign-in failed: ${error.message}`);
            return;
          }
          if (data?.session) {
            setMessage('Signed in! Redirecting…');
            setTimeout(() => router.replace('/'), 600);
            return;
          }
        }

        setMessage('Invalid callback URL: missing auth params.');
      } catch {
        setMessage('Sign-in failed.');
      }
    })();
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-10">
      <p>{message}</p>
    </div>
  );
}
