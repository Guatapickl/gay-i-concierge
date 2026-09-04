"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { completeMagicLink } from '@/lib/firebase/authClient';

/**
 * Magic-link landing page. Firebase's email link points here; we finish the
 * sign-in on the client (the SDK reads the code from the URL) and go home.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await completeMagicLink(window.location.href);
        if (cancelled) return;
        if (!user) {
          setError('This link is not a valid sign-in link.');
          return;
        }
        router.replace('/');
        router.refresh();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="card-elevated p-6 space-y-4 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-display font-semibold text-foreground">That link didn&apos;t work</h1>
            <p className="text-sm text-foreground-muted">{error}</p>
            <Link href="/auth/auth-code-error" className="btn-brand text-sm">What now?</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-display font-semibold text-foreground">Signing you in…</h1>
            <p className="text-sm text-foreground-muted">Hang tight, this only takes a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
