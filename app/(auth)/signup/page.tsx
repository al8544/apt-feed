'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthHeader, Button, Field, safeNext } from '@/components/AuthUI';

// Figma 00c Sign up. The name goes into the auth user's metadata; migration 0009 copies it into profiles.
export default function SignUpPage() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) router.replace(safeNext(next));
    else setCheckEmail(true); // projects with email confirmation on: no session until the link is clicked
  }

  return (
    <form
      onSubmit={submit}
      className="flex min-h-dvh flex-col gap-4 bg-card px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]"
    >
      <AuthHeader title="Join the flock" subtitle="Make an account to start house hunting" />
      <Field label="Name" autoComplete="name" placeholder="What should we call you?" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Email" type="email" autoComplete="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-base text-danger">
          {error}
        </p>
      )}
      {checkEmail && (
        <p role="status" className="text-base text-accent">
          Check your email for a link to confirm your account, then sign in.
        </p>
      )}
      <div className="flex-1" />
      <Button type="submit" disabled={busy || checkEmail}>
        {busy ? 'Creating…' : 'Create account'}
      </Button>
      <p className="text-center text-lg text-muted">
        Already have an account?{' '}
        <Link href={`/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
