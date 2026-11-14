import { createBrowserClient } from '@supabase/ssr';

// Browser client. The session lives in cookies (not localStorage) so proxy.ts can see who is signed in.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
