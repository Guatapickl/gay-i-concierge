import { getDoc } from 'firebase/firestore';
import { currentUser } from './firebase/authClient';
import { ref } from './firebase/db';

/** Client-side admin check mirroring the `is_admin()` SQL function: app_admins/{uid} exists. */
export async function isCurrentUserAdmin(userId?: string | null): Promise<boolean> {
  let uid = userId;
  if (!uid) {
    const u = await currentUser();
    uid = u?.uid ?? null;
  }
  if (!uid) return false;
  try {
    const snap = await getDoc(ref('app_admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}
