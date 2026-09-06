import { NextResponse } from 'next/server';
import { adminDb, userFromRequest } from '@/lib/firebase/admin';
import { adminToIso } from '@/lib/firebase/adminDb';
import type { DirectoryMember } from '@/lib/directory';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

function member(doc: { id: string; data(): Record<string, unknown> | undefined }): DirectoryMember {
  const data = doc.data() || {};
  return {
    id: doc.id,
    full_name: typeof data.full_name === 'string' ? data.full_name : null,
    experience_level: typeof data.experience_level === 'string' ? data.experience_level : null,
    interests: Array.isArray(data.interests) ? data.interests.filter((v): v is string => typeof v === 'string') : null,
    created_at: adminToIso(data.created_at) || '',
  };
}

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Sign in to view members.' }, { status: 401, headers });
  const id = new URL(req.url).searchParams.get('id');
  if (id !== null && (!id || id.includes('/') || id.length > 128)) return NextResponse.json({ error: 'Invalid member ID.' }, { status: 400, headers });
  try {
    const profiles = adminDb().collection('user_profiles');
    if (id) {
      const doc = await profiles.doc(id).get();
      return NextResponse.json({ member: doc.exists ? member(doc) : null }, { headers });
    }
    // Firestore orderBy omits documents without that field; older profiles may lack it.
    const snapshot = await profiles.get();
    const members = snapshot.docs.map(member).sort((a, b) => b.created_at.localeCompare(a.created_at) || (a.full_name || '').localeCompare(b.full_name || ''));
    return NextResponse.json({ members }, { headers });
  } catch {
    return NextResponse.json({ error: 'Member directory is temporarily unavailable.' }, { status: 503, headers });
  }
}
