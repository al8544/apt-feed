// Who is calling a Route Handler (docs/DESIGN.md §10). The browser keeps the Supabase session in localStorage, so the client
// sends it as `Authorization: Bearer <access token>`. We verify it with Supabase and build a client that acts as that
// user, so row-level security still applies. There is NO sign-in in the app yet (ticket T9): until then nothing in the UI
// can produce a token, and these routes answer 401 to everyone else.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export type Caller = { user: User; db: SupabaseClient };

export async function requireUser(request: Request): Promise<Caller | Response> {
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  return { user: data.user, db };
}
