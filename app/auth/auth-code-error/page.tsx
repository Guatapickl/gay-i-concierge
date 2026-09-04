import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="card-elevated p-6 space-y-4 text-center">
        <h1 className="text-xl font-display font-semibold text-foreground">That link didn&apos;t work</h1>
        <p className="text-sm text-foreground-muted">
          The sign-in link may have expired or already been used. Request a fresh one and try again.
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/auth/sign-in" className="btn-brand text-sm">Back to sign in</Link>
          <Link href="/auth/forgot" className="text-sm text-foreground-muted hover:text-primary transition-colors">
            Reset my password instead
          </Link>
        </div>
      </div>
    </div>
  );
}
