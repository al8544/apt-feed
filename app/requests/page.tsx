'use client';
import { useEffect, useState } from 'react';
import { answerJoinRequest, getJoinRequests, type JoinRequest } from '@/lib/api';
import { listSummary, money, parseDateOnly, timeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';
import NavBar from '@/components/NavBar';

const RESULT = { approved: 'Added to the flock.', declined: 'Declined.', full: 'The flock is full, so nobody else can join.', no_request: 'That request is gone.' } as const;

// Figma 05f Join Requests. Admins answer the people who asked to join from Find a flock.
export default function RequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    getJoinRequests().then(setRequests).catch((e) => (setNote(e.message), setRequests([])));
  }, []);

  async function answer(r: JoinRequest, approve: boolean) {
    setBusy(r.user.id);
    setNote(null);
    try {
      const result = await answerJoinRequest(r.user.id, approve);
      setNote(`${r.user.display_name}: ${RESULT[result]}`);
      if (result !== 'full') setRequests((rs) => rs?.filter((x) => x.user.id !== r.user.id) ?? rs);
    } catch (e) {
      setNote((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <main className="min-h-dvh bg-card pb-6">
      <NavBar title="Join requests" />
      <p className="px-4 pb-2 text-[15px] text-muted">
        {requests ? (requests.length ? `${requests.length} ${requests.length === 1 ? 'person wants' : 'people want'} to join` : 'Nobody is waiting') : ' '}
      </p>
      {note && <p role="status" className="px-4 pb-2 text-base text-accent">{note}</p>}
      <div className="flex flex-col gap-3 px-4">
        {!requests
          ? [0, 1].map((i) => <div key={i} className="h-[230px] animate-pulse rounded-lg bg-surface" />)
          : requests.length === 0
            ? <p className="rough rounded-lg p-4 text-center text-lg text-muted [--fill:var(--color-surface)]">No requests right now. People who ask to join from Find a flock show up here.</p>
            : requests.map((r) => <Card key={r.user.id} r={r} busy={busy === r.user.id} onAnswer={(a) => answer(r, a)} />)}
      </div>
      {!!requests?.length && (
        <p className="px-4 pt-3 text-[15px] text-muted">Approving adds them to the flock right away. Declining tells them no, and they can ask again later.</p>
      )}
    </main>
  );
}

function Card({ r, busy, onAnswer }: { r: JoinRequest; busy: boolean; onAnswer: (approve: boolean) => void }) {
  const u = r.user;
  const misses = r.checks.filter((c) => c.ok === false).map((c) => c.reason);
  const facts = [
    u.budget_max != null && `Up to ${money(u.budget_max)}`,
    u.beds_min != null && `${u.beds_min}+ bd`,
    u.neighborhoods?.length && listSummary(u.neighborhoods),
    u.move_in && parseDateOnly(u.move_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  ].filter(Boolean);
  const strong = r.matchPct != null && r.matchPct >= 60;
  return (
    <section className="rough flex flex-col gap-2 rounded-lg p-3.5 [--fill:var(--color-surface)]">
      <div className="flex items-center gap-3">
        <Avatar user={u} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[21px] font-bold text-ink">{u.display_name}</p>
          <p className="truncate text-base text-muted">@{u.username} · {timeAgo(r.requestedAt) === 'now' ? 'just now' : `${timeAgo(r.requestedAt)} ago`}</p>
        </div>
        {r.matchPct != null && (
          <span className={`rounded-[7px] px-2.5 py-[3px] text-[15px] font-bold ${strong ? 'bg-accent-soft text-accent' : 'bg-card text-muted'}`}>{r.matchPct}% match</span>
        )}
      </div>
      {([['About', u.about], ['Looking for', u.looking_for], ['Dealbreakers', u.dealbreakers_text]] as const).map(([label, text]) =>
        text?.trim() ? (
          <div key={label}>
            <p className="text-base font-bold text-ink">{label}</p>
            <p className="text-[17px] whitespace-pre-line text-muted">{text.trim()}</p>
          </div>
        ) : null
      )}
      {facts.length > 0 && <p className="text-base font-bold text-ink">{facts.join(' · ')}</p>}
      <p className={`text-base ${misses.length ? 'text-muted' : 'text-accent'}`}>
        {misses.length ? `Doesn't fit: ${misses.join('; ')}.` : 'Fits every rule.'}
      </p>
      <div className="flex gap-2.5 pt-1">
        <button disabled={busy} onClick={() => onAnswer(false)} className="rough flex-1 rounded-lg py-2.5 text-xl font-bold text-ink [--fill:var(--color-surface)] disabled:opacity-50">
          Decline
        </button>
        <button disabled={busy} onClick={() => onAnswer(true)} className="rough flex-1 rounded-lg py-2.5 text-xl font-bold text-card [--fill:var(--color-ink)] disabled:opacity-50">
          {busy ? '…' : 'Approve'}
        </button>
      </div>
    </section>
  );
}
