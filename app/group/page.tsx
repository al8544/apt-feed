'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus, Trophy } from 'lucide-react';
import {
  CURRENT_USER_ID,
  getGroupMembers,
  getMapListings,
  getProfile,
  type GroupListing,
  type Member,
  type Profile,
} from '@/lib/api';
import { GROUP_NAME, groupPrefs, listSummary, money, parseDateOnly } from '@/lib/format';
import { inviteFriends } from '@/lib/share';
import Avatar from '@/components/Avatar';
import ListingPhoto from '@/components/ListingPhoto';
import SettingsRow from '@/components/SettingsRow';
import PreferencesSheet from '@/components/PreferencesSheet';
import MessageSheet from '@/components/MessageSheet';

// Flock score: 70% share of the flock that swiped right, 30% how well it fits everyone's prefs.
const score = (l: GroupListing, groupSize: number) =>
  Math.round(70 * (groupSize ? l.likes / groupSize : 0) + 0.3 * l.match.pct);

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

  const invite = async () => setToast(await inviteFriends(GROUP_NAME));

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
        : `${money(prefs.budgetMin)} – ${money(prefs.budgetMax)}`
      : 'Any';
  const moveIn = prefs?.moveIn ? parseDateOnly(prefs.moveIn) : null;

  return (
    <main className="pb-4">
      <header className="flex items-center gap-1 px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2">
        <h1 className="text-[22px] font-bold text-ink">{GROUP_NAME}</h1>
        <ChevronDown size={18} strokeWidth={1.5} className="text-ink" />
        <div className="flex-1" />
        <Link href="/account" aria-label="My account" className="rounded-full">
          {me ? <Avatar user={me} size={30} /> : <div className="size-[30px] animate-pulse rounded-full bg-surface" />}
        </Link>
      </header>

      <section className="flex flex-col gap-3 px-4 pt-2 pb-1">
        <div className="flex">
          {!members
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="-mr-3 size-14 animate-pulse rounded-full border-[3px] border-cream bg-surface" />
              ))
            : members.slice(0, 4).map((m) => <Avatar key={m.id} user={m} size={56} className="-mr-3 border-[3px] border-cream" />)}
          <button
            onClick={invite}
            aria-label="Invite friends"
            className="rough rough-surface flex size-14 items-center justify-center rounded-full text-ink"
          >
            <Plus size={22} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 text-sm">
          <p className="font-semibold text-ink">
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
          <button onClick={invite} className="rough rough-surface flex-1 rounded-lg py-[7px] text-[15px] font-bold text-ink">
            Invite friends
          </button>
          <button onClick={() => setPrefsOpen(true)} className="rough rough-surface flex-1 rounded-lg py-[7px] text-[15px] font-bold text-ink">
            Flock preferences
          </button>
        </div>
      </section>

      {error && <p className="px-4 pt-3 text-[13px] text-danger">{error}</p>}

      <SectionHeader
        title={
          <>
            <Trophy size={18} strokeWidth={1.5} /> Flock rankings
          </>
        }
        action={ranked.length > 4 ? (showAll ? 'Show less' : 'See all') : undefined}
        onAction={() => setShowAll((s) => !s)}
      />
      <p className="px-4 pb-1.5 text-[13px] text-muted">Ranked by everyone&apos;s swipes &amp; flock prefs</p>
      {!listings || !members ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-2">
            <div className="w-[18px]" />
            <div className="size-[60px] rounded-xl bg-surface" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3.5 w-28 rounded bg-surface" />
              <div className="h-3 w-44 rounded bg-surface" />
            </div>
          </div>
        ))
      ) : ranked.length === 0 ? (
        <p className="rough rough-surface mx-4 rounded-[18px] p-4 text-center text-[14px] text-muted">
          No one has swiped right yet. Rankings show up once your flock starts liking places.
        </p>
      ) : (
        visibleRanked.map(({ l, score }, i) => (
          <div key={l.id} className="flex items-center gap-3 px-4 py-2">
            <span className="w-[18px] text-center text-lg font-bold text-ink">{i + 1}</span>
            <ListingPhoto listing={l} rough className="size-[60px] shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-[15px] font-semibold text-ink">
                {money(l.price)} · {l.beds} bd
              </p>
              <p className="truncate text-[13px] text-muted">
                {l.address} · {l.neighborhood}
              </p>
              <div className="flex items-center gap-2 pt-[5px]">
                <div className="h-[5px] w-16 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (l.likes / size) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-muted">
                  {l.likes}/{size} swiped right
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[17px] font-bold text-accent">{score}</span>
              <span className="text-[11px] text-muted">score</span>
            </div>
          </div>
        ))
      )}

      <SectionHeader title="Members" />
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
                <p className="truncate text-[15px] font-semibold text-ink">
                  {m.display_name}
                  {m.id === CURRENT_USER_ID && <span className="font-normal text-muted"> (you)</span>}
                </p>
                <p className="truncate text-[13px] text-muted">
                  @{m.username}
                  {m.role === 'admin' && ' · admin'} · {m.swipeCount} {m.swipeCount === 1 ? 'swipe' : 'swipes'}
                </p>
              </div>
              {m.id !== CURRENT_USER_ID && (
                <button onClick={() => setChatWith(m)} className="rough rough-surface rounded-lg px-3.5 py-[5px] text-[15px] font-bold text-ink">
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
        <div className="mx-4 h-40 animate-pulse rounded-xl bg-surface" />
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

      {toast && (
        <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream">
          {toast}
        </div>
      )}
    </main>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: React.ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center px-4 pt-5 pb-1">
      <h2 className="flex flex-1 items-center gap-1.5 text-[17px] font-semibold text-ink">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-sm font-semibold text-accent">
          {action}
        </button>
      )}
    </div>
  );
}
