'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DEMO, forgetFlock, loadCurrentFlock, setSessionUser, storedFlockId } from '@/lib/api';

// Pages that work signed out, and pages that work before a flock is picked.
export const AUTH_PAGES = ['/welcome', '/signin', '/signup'];
const NO_FLOCK_OK = (p: string) => p.startsWith('/flocks') || p.startsWith('/join/') || p === '/account';

// Reads the Supabase session once and sets CURRENT_USER_ID before any screen fetches data.
// Signed out → Welcome; no flock picked yet → Your flocks (docs/DESIGN.md §10, Figma 00a–00d).
export default function SessionGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const open = DEMO || AUTH_PAGES.includes(path);
  const [user, setUser] = useState<string | null | undefined>(undefined); // undefined = still loading
  const [flockReady, setFlockReady] = useState(false);

  useEffect(() => {
    if (DEMO) return;
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null;
      if (id) setSessionUser(id);
      setUser(id);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // A full reload (not router.push) on purpose: it drops the last user's data and ids from memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (event === 'SIGNED_OUT') window.location.assign('/welcome');
      else if (session) {
        setSessionUser(session.user.id);
        setUser(session.user.id);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Once signed in: confirm the saved flock (and load its name); a flock you left sends you back to Your flocks.
  useEffect(() => {
    if (DEMO || !user || !storedFlockId()) return;
    loadCurrentFlock().then((ok) => {
      if (!ok) forgetFlock();
      setFlockReady(true);
    });
  }, [user, path]);

  const needsSignIn = !open && user === null; // checked, and nobody is signed in
  const needsFlock = !open && !!user && !storedFlockId() && !NO_FLOCK_OK(path);
  useEffect(() => {
    if (needsSignIn) router.replace(`/welcome?next=${encodeURIComponent(path)}`);
    else if (needsFlock) router.replace('/flocks');
  }, [needsSignIn, needsFlock, path, router]);

  if (open) return <>{children}</>;
  if (!user || needsFlock || (!flockReady && !!storedFlockId() && !NO_FLOCK_OK(path)))
    return <div className="min-h-dvh bg-card" aria-busy="true" />;
  return <>{children}</>;
}
