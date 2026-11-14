'use client';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/AuthUI';

// Figma 00a Welcome.
export default function WelcomePage() {
  const next = useSearchParams().get('next');
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <main className="flex min-h-dvh flex-col gap-3 bg-card px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]">
      <div className="flex-1" />
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-pond.png" alt="Flock" width={220} height={120} />
        <p className="text-[22px] text-muted">Find a home with your flock</p>
      </div>
      <div className="flex-1" />
      <Button href={`/signin${q}`}>Sign in</Button>
      <Button href={`/signup${q}`} secondary>
        Create account
      </Button>
    </main>
  );
}
