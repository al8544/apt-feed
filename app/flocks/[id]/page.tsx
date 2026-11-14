'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFlockProfile, joinFlock, selectFlock, type DiscoveredFlock } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/AuthUI';
import { StepHeader, screen } from '@/components/FormUI';

const RESULT: Record<string, string> = {
  requested: "You don't fit every rule, so we sent the flock a request.",
  full: 'This flock is full.',
  closed: 'This flock is not taking new people.',
};

// Figma 00j Flock profile · Join. "Why you match" comes from compat() on the server, as coarse reasons.
export default function FlockProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [flock, setFlock] = useState<DiscoveredFlock | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    getFlockProfile(id)
      .then(setFlock)
      .catch((e) => (setNote(e.message), setFlock(null)));
  }, [id]);

  async function join() {
    setBusy(true);
    try {
      const status = await joinFlock(id);
      if (status === 'joined' || status === 'already_member') {
        selectFlock(id);
        return router.replace('/');
      }
      setNote(RESULT[status] ?? status);
    } catch (e) {
      setNote((e as Error).message);
    }
    setBusy(false);
  }

  if (flock === undefined) return <main className={screen} aria-busy="true" />;
  if (!flock)
    return (
      <main className={screen}>
        <StepHeader back="/flocks/find" title="Flock not found" subtitle={note ?? 'It may have closed or filled up.'} />
      </main>
    );

  const free = flock.maxSize ? Math.max(0, flock.maxSize - flock.members.length) : 0;
  return (
    <main className={screen}>
      <StepHeader back="/flocks/find" />
      <div className="-mt-3 flex items-center gap-2.5">
        <h1 className="text-[34px] font-bold text-ink">{flock.name}</h1>
        <span className="rounded-[7px] bg-accent-soft px-2.5 py-[3px] text-sm font-bold text-accent">Open</span>
      </div>
      <p className="text-lg text-muted">
        {[flock.area, flock.maxSize ? `${flock.members.length} of ${flock.maxSize} spots filled` : `${flock.members.length} in flock`]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <div className="flex">
        {flock.members.map((m) => (
          <Avatar key={m.id} user={m} size={44} className="-mr-2" />
        ))}
        {Array.from({ length: Math.min(free, 3) }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src="/icons/open-spot.png" alt="Open spot" width={44} height={44} className="-mr-2" />
        ))}
      </div>

      <div className={`rough rounded-lg px-4 py-3 ${flock.passes ? '[--fill:var(--color-accent-soft)]' : '[--fill:var(--color-surface)]'}`}>
        <p className={`text-[28px] font-bold ${flock.passes ? 'text-accent' : 'text-ink'}`}>{flock.matchPct}% match</p>
        <p className="text-[17px] text-ink">
          {flock.passes ? 'You fit every rule, so you can join right away.' : "You don't fit every rule. Joining sends the flock a request."}
        </p>
      </div>

      {flock.about && (
        <>
          <h2 className="text-[19px] font-bold text-ink">About this flock</h2>
          <p className="text-[17px] whitespace-pre-line text-muted">{flock.about}</p>
        </>
      )}
      {flock.lookingFor && (
        <>
          <h2 className="text-[19px] font-bold text-ink">Who they&apos;re looking for</h2>
          <p className="text-[17px] whitespace-pre-line text-muted">{flock.lookingFor}</p>
        </>
      )}

      <h2 className="text-[19px] font-bold text-ink">Why you match</h2>
      <ul className="flex flex-col gap-2.5">
        {flock.checks.map((c) => (
          <li key={c.key} className="flex items-center gap-2.5 text-[17px] text-ink">
            <span
              aria-label={c.ok ? 'fits' : c.ok === false ? 'does not fit' : 'unknown'}
              className={`flex size-[22px] shrink-0 items-center justify-center rounded-md text-sm font-bold ${c.ok ? 'bg-accent-soft' : 'bg-surface text-muted'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.ok ? <img src="/icons/check.svg" alt="" width={14} height={14} /> : c.ok === false ? '✕' : '?'}
            </span>
            <span className={c.ok === false ? 'text-muted' : ''}>{c.reason[0]!.toUpperCase() + c.reason.slice(1)}</span>
          </li>
        ))}
      </ul>

      {note && (
        <p role="status" className="text-base text-accent">
          {note}
        </p>
      )}
      <div className="flex-1" />
      <Button onClick={join} disabled={busy || !!note}>
        {busy ? 'Joining…' : flock.passes ? 'Join flock' : 'Ask to join'}
      </Button>
      <p className="text-center text-[15px] text-muted">You can leave any time</p>
    </main>
  );
}
