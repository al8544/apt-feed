// Service-role client: server code only (Route Handlers). It bypasses row-level security, so anything it reads
// must be reduced to public fields before it leaves the server (docs/DESIGN.md §7.4 privacy, §10 secrets).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let admin: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (server only; see .env.example).');
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
