/**
 * Post-sign-in destination guard. The middleware sends signed-out members
 * to `/auth/sign-in?next=<path>`; only a same-site path may be followed.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
