import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** Paused by the owner. Keep this endpoint inert for old tabs and direct callers. */
export async function POST() {
  return NextResponse.json(
    { error: 'AIlex is temporarily unavailable.', code: 'AILEX_DISABLED' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
