import { NextResponse } from 'next/server';

export const runtime = 'edge';

/** A reusable invitation needs no model request or paid API key. */
export async function POST() {
  return NextResponse.json({
    message: 'Join me at Gay I Club, a NYC community of gay people exploring AI. We meet to share ideas, discuss the latest news, and show what we’re building. Come check it out: https://gayiclub.com',
  });
}
