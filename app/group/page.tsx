'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CURRENT_USER_ID,
  getGroupMembers,
  getMapListings,
  getProfile,
  type GroupListing,
  type Member,
  type Profile,
  FLOCK_NAME,
} from '@/lib/api';
import { groupPrefs, listSummary, money, parseDateOnly } from '@/lib/format';
import { inviteFriends } from '@/lib/share';
import Avatar from '@/components/Avatar';
import SettingsRow from '@/components/SettingsRow';
import PreferencesSheet from '@/components/PreferencesSheet';
import MessageSheet from '@/components/MessageSheet';
import { flockScore as score } from '@/lib/compare';
import RankingRow from '@/components/RankingRow';
import SmallerFlockPrompt from '@/components/SmallerFlockPrompt';


export default function GroupPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [listings, setListings] = useState<GroupListing[] | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [chatWith, setChatWith] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const fail = (e: Error) => setError(e.message);
    getGroupMembers().then(setMembers).catch((e) => (fail(e), setMembers([])));
    getMapListings().then(setListings).catch((e) => (fail(e), setListings([])));
    getProfile().then(setMe).catch(fail);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const invite = async () => setToast(await inviteFriends(FLOCK_NAME));

  const size = members?.length ?? 0;
  const prefs = members ? groupPrefs(members) : null;
  const ranked = (listings ?? [])
    .filter((l) => l.likes > 0)
    .map((l) => ({ l, score: score(l, size) }))
    .sort((a, b) => b.score - a.score);
  const visibleRanked = showAll ? ranked : ranked.slice(0, 4);

  const budget =
    prefs?.budgetMin != null && prefs.budgetMax != null
      ? prefs.budgetMin === prefs.budgetMax
        ? money(prefs.budgetMax)
        : `${money(prefs.budgetMin)}–${money(prefs.budgetMax)}`
      : 'Any';
  const moveIn = prefs?.moveIn ? parseDateOnly(prefs.moveIn) : null;

  return (
    <main className="min-h-dvh bg-card pb-4">
      <SmallerFlockPrompt />
      <header className="flex items-center gap-1 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <h1 className="text-[26px] font-bold text-ink">{FLOCK_NAME}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/down.svg" alt="" width={18} height={18} />
        <div className="flex-1" />
        <Link href="/account" aria-label="My account" className="rounded-full border-2 border-line">
          {me ? <Avatar user={me} size={30} /> : <div className="size-[30px] animate-pulse rounded-full bg-surface" />}
        </Link>
      </header>

      <section className="flex flex-col gap-3 px-4 pt-2 pb-1">
        <div className="flex">
          {!members
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="-mr-3 size-14 animate-pulse rounded-full border-[3px] border-card bg-surface" />
              ))
            : members.slice(0, 4).map((m) => <Avatar key={m.id} user={m} size={56} className="-mr-3 border-[3px] border-card" />)}
          <button onClick={invite} aria-label="Invite friends">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/invite.svg" alt="" width={58} height={58} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 text-[17px]">
          <p className="font-bold text-ink">
            {members ? `${size} ${size === 1 ? 'friend' : 'friends'} hunting together` : ' '}
          </p>
          {prefs && (
            <p className="text-muted">
              {prefs.beds ? `${prefs.beds} bd` : 'Any size'} in {listSummary(prefs.hoods)} · {budget}
              {moveIn && ` · move-in ${moveIn.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/invite" className="rough flex-1 rounded-lg py-[9px] text-center text-[17px] font-bold text-ink [--fill:var(--color-surface)]">
            Invite friends
          </Link>
          <button
            onClick={() => setPrefsOpen(true)}
            className="rough flex-1 rounded-lg py-[9px] text-[17px] font-bold text-ink [--fill:var(--color-surface)]"
          >
            Flock preferences
          </button>
        </div>
      </section>

      {error && <p className="px-4 pt-3 text-[15px] text-danger">{error}</p>}

      <SectionHeader
        title={
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/trophy.svg" alt="" width={18} height={18} /> Flock rankings
          </>
        }
        extra={
          <>
            <Link href="/compare/pick" className="text-[17px] font-bold text-ink">
              Compare
            </Link>
            {ranked.length > 4 && <span className="w-[22px] text-center text-[17px] text-ink/50">·</span>}
          </>
        }
        action={ranked.length > 4 ? (showAll ? 'Show less' : 'See all') : undefined}
        onAction={() => setShowAll((s) => !s)}
      />
      <p className="px-4 pb-1.5 text-[15px] text-muted">Ranked by everyone&apos;s likes &amp; flock prefs</p>
      {!listings || !members ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-2">
            <div className="w-[18px]" />
            <div className="size-[60px] rounded-[5px] bg-surface" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3.5 w-28 rounded bg-surface" />
              <div className="h-3 w-44 rounded bg-surface" />
            </div>
          </div>
        ))
      ) : ranked.length === 0 ? (
        <p className="rough mx-4 rounded-[7px] p-4 text-center text-base text-muted [--fill:var(--color-surface)]">
          No one has liked a place yet. Rankings show up once your flock starts liking places.
        </p>
      ) : (
        visibleRanked.map(({ l, score }, i) => <RankingRow key={l.id} href={`/listing/${l.id}`} rank={i + 1} listing={l} score={score} groupSize={size} />)
      )}

      <SectionHeader
        title="Members"
        extra={
          <Link href="/members" className="text-[17px] font-bold text-accent">
            Manage
          </Link>
        }
      />
      {!members
        ? [0, 1, 2].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-2">
              <div className="size-11 rounded-full bg-surface" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-28 rounded bg-surface" />
                <div className="h-3 w-36 rounded bg-surface" />
              </div>
            </div>
          ))
        : members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2">
              <Avatar user={m} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[21px] font-bold text-ink">
                  {m.display_name}
                  {m.id === CURRENT_USER_ID && <span className="font-normal text-muted"> (you)</span>}
                </p>
                <p className="truncate text-lg text-muted">
                  @{m.username}
                  {m.role === 'admin' && ' · admin'} · {m.swipeCount} {m.swipeCount === 1 ? 'like' : 'likes'}
                </p>
              </div>
              {m.id !== CURRENT_USER_ID && (
                <button
                  onClick={() => setChatWith(m)}
                  className="rough rounded-lg px-3.5 py-[7px] text-lg font-bold text-ink [--fill:var(--color-surface)]"
                >
                  Message
                </button>
              )}
            </div>
          ))}

      <SectionHeader title="Flock preferences" action="Edit" onAction={() => setPrefsOpen(true)} />
      {prefs ? (
        <>
          <SettingsRow label="Budget" value={budget} onClick={() => setPrefsOpen(true)} />
          <SettingsRow label="Bedrooms" value={prefs.beds ? `${prefs.beds}+` : 'Any'} onClick={() => setPrefsOpen(true)} />
          <SettingsRow label="Neighborhoods" value={listSummary(prefs.hoods)} onClick={() => setPrefsOpen(true)} />
          <SettingsRow
            label="Move-in"
            value={moveIn ? moveIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}
            onClick={() => setPrefsOpen(true)}
          />
          <SettingsRow label="Pets" value={prefs.pets ? 'Required' : 'Not needed'} onClick={() => setPrefsOpen(true)} />
        </>
      ) : (
        <div className="mx-4 h-40 animate-pulse rounded-[5px] bg-surface" />
      )}

      <PreferencesSheet
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        profile={me}
        title="Your preferences"
        onSaved={(p) => {
          setMe((prev) => (prev ? { ...prev, ...p } : prev));
          setMembers((prev) => prev?.map((m) => (m.id === CURRENT_USER_ID ? { ...m, ...p } : m)) ?? prev);
          getMapListings().then(setListings).catch(() => {});
        }}
      />
      <MessageSheet member={chatWith} onClose={() => setChatWith(null)} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }} className="rough fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-[9px] px-4 py-2 text-base font-bold text-card [--fill:var(--color-ink)]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SectionHeader({
  title,
  extra,
  action,
  onAction,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center px-4 pt-5 pb-1">
      <h2 className="flex flex-1 items-center gap-1.5 text-xl font-bold text-ink">{title}</h2>
      {extra}
      {action && (
        <button onClick={onAction} className="text-[17px] font-bold text-accent">
          {action}
        </button>
      )}
    </div>
  );
}
