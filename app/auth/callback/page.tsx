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
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          setMessage(`Sign-in failed: ${error.message}`);
          return;
        }
        if (data?.session) {
          setMessage('Signed in! Redirecting…');
          setTimeout(() => router.replace('/'), 600);
        } else {
          setMessage('No session returned.');
        }
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
