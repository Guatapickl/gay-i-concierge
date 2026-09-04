/**
 * Resolve the caller of an API route. Prefers `Authorization: Bearer <idToken>`
 * (what lib/rsvp.ts and the poll admin page send); falls back to the
 * `__session` cookie for pages that fetch same-origin without a header
 * (robot page, news page). Never throws.
 */
import { userFromRequest } from '@/lib/firebase/admin';

export type Caller = { uid: string; email: string | null };

export async function callerFromRequest(req: Request): Promise<Caller | null> {
  const fromHeader = await userFromRequest(req);
  if (fromHeader) return fromHeader;
  if (!req.headers.get('cookie')) return null;
  try {
    const { getServerUser } = await import('@/lib/firebase/session');
    return await getServerUser();
  } catch {
    return null;
  }
}
