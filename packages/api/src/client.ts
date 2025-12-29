import { createClient } from '@supabase/supabase-js';

// Lazy client creation - only created when actually used at runtime
export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not set');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server-side client with service role
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables not set');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// Backwards compatibility - use getSupabase() in new code
export const supabase = new Proxy({} as ReturnType<typeof getSupabase>, {
  get(_, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof getSupabase>];
  }
});

export type SupabaseClient = ReturnType<typeof getSupabase>;