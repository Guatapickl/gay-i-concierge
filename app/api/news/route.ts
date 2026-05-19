import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Pagination parameters
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('news_items')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('ingested_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: {
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Optionally allow if we use an API key in the authorization header
    // Some routes use supabase-js directly with the auth header
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      title, 
      summary, 
      source_url, 
      source_name, 
      tag, 
      tag_color, 
      published_at, 
      is_hot, 
      relevance_score 
    } = body;

    if (!title || !summary || !source_url) {
      return NextResponse.json(
        { error: 'Missing required fields: title, summary, source_url' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('news_items')
      .insert({
        title,
        summary,
        source_url,
        source_name: source_name || null,
        tag: tag || null,
        tag_color: tag_color || null,
        published_at: published_at || new Date().toISOString(),
        is_hot: is_hot || false,
        relevance_score: relevance_score || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
