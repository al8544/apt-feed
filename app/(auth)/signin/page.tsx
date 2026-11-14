'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthHeader, Button, Field, safeNext } from '@/components/AuthUI';

// Figma 00b Sign in.
export default function SignInPage() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
      setBusy(false);
      return;
    }
    router.replace(safeNext(next));
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-dvh flex-col gap-4 bg-card px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]"
    >
      <AuthHeader title="Welcome back" subtitle="Sign in to see your flocks" />
      <Field label="Email" type="email" autoComplete="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {/* shortcut: reset needs an email link and a reset page; shown disabled until that lands */}
      <span aria-disabled className="text-[17px] font-bold text-accent opacity-50" title="Coming soon">
        Forgot password?
      </span>
      {error && (
        <p role="alert" className="text-base text-danger">
          {error}
        </p>
      )}
      <div className="flex-1" />
      <Button type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-lg text-muted">
        New here?{' '}
        <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-accent">
          Create an account
        </Link>
      </p>
    </form>
  );
}
