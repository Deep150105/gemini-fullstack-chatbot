import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getAuthenticatedUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, token, error } = await getAuthenticatedUser(req);
  if (!user || !token) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  const conversationId = params.id;
  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversation id parameter' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient(token);
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error: dbError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data });
}
