'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { joinByInvite, selectFlock } from '@/lib/api';
import { Button } from '@/components/AuthUI';

// Invite link: /join/<flock id>. Signed-out visitors are sent to Welcome first and come back here after.
export default function JoinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    joinByInvite(id)
      .then((status) => {
        if (status === 'full') return setProblem('This flock is full.');
        selectFlock(id);
        router.replace('/');
      })
      .catch((e: Error) => setProblem(/no such flock|invalid input/i.test(e.message) ? 'This invite link is not valid.' : e.message));
  }, [id, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-card px-4 text-center">
      {problem ? (
        <>
          <p className="text-xl text-ink">{problem}</p>
          <Button href="/flocks">Your flocks</Button>
        </>
      ) : (
        <p className="text-xl text-muted" aria-busy="true">
          Joining the flock…
        </p>
      )}
    </main>
  );
}
