import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Creates an authenticated Supabase server client scoped to the requesting user's JWT.
 */
export function createServerSupabaseClient(accessToken?: string): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

/**
 * Creates an admin/service-role Supabase client for backend operations.
 */
export function createAdminSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Extracts and verifies the authenticated user from an incoming Request.
 */
export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return { user: null, token: null, error: 'Missing authorization header' };
  }

  const supabase = createServerSupabaseClient(token);
  if (!supabase) {
    return { user: null, token, error: 'Supabase is not configured' };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, token, error: error?.message || 'Invalid authentication token' };
  }

  return { user, token, error: null };
}
