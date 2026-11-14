'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO, getAccountStats, getProfile, getStash, signOut, type Listing, type Profile } from '@/lib/api';
import { GROUP_NAME, money, area } from '@/lib/format';
import Avatar from '@/components/Avatar';
import ListingPhoto from '@/components/ListingPhoto';
import SettingsRow from '@/components/SettingsRow';
import PreferencesSheet from '@/components/PreferencesSheet';
import UserSwitcher from '@/components/UserSwitcher';
import Icon from '@/components/Icon';
import NavBar from '@/components/NavBar';

type Stats = { swipes: number; stashed: number; tours: number };

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [stash, setStash] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const fail = (e: Error) => setError(e.message);
    getProfile().then(setProfile).catch(fail);
    getAccountStats().then(setStats).catch(fail);
    getStash().then(setStash).catch((e) => (fail(e), setStash([])));
  }, []);

  return (
    <main className="min-h-dvh bg-surface pb-6">
      <NavBar title="Account" />

      <section className="flex flex-col items-center gap-1 pt-3 pb-2">
        {profile ? (
          <>
            <Avatar user={profile} size={84} />
            <p className="text-2xl font-bold text-ink">{profile.display_name}</p>
            <p className="text-[17px] text-muted">@{profile.username}</p>
            {profile.bio && <p className="max-w-[300px] text-center text-[17px] text-ink">{profile.bio}</p>}
          </>
        ) : (
          <>
            <div className="size-[84px] animate-pulse rounded-full bg-card" />
            <div className="mt-1 h-5 w-32 animate-pulse rounded bg-card" />
            <div className="h-4 w-24 animate-pulse rounded bg-card" />
          </>
        )}
        <button
          onClick={() => setEditOpen(true)}
          disabled={!profile}
          className="rough mt-1 rounded-[9px] px-4 py-2 text-[17px] font-bold text-ink"
        >
          Edit profile
        </button>
        {DEMO && <UserSwitcher />}
      </section>

      {error && <p className="px-4 pt-2 text-[15px] text-danger">{error}</p>}

      <div className="flex items-center px-4 pt-4 pb-2">
        <h2 className="flex flex-1 items-center gap-1.5 text-xl font-bold text-ink">
          <Icon name="save" scale={18 / 22} />
          My stash
          {stash && <span className="text-lg font-normal text-muted">{stash.length}</span>}
        </h2>
        {stash && stash.length > 3 && (
          <Link href="/stash" className="text-[17px] font-bold text-accent">
            See all
          </Link>
        )}
      </div>
      {!stash ? (
        <div className="flex gap-2.5 overflow-hidden pl-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="size-[108px] shrink-0 animate-pulse rounded-md bg-card" />
          ))}
        </div>
      ) : stash.length === 0 ? (
        <p className="rough mx-4 rounded-md p-4 text-center text-base text-muted">
          Nothing stashed yet. Tap the bookmark on any listing to save it here.
        </p>
      ) : (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4">
          {stash.map((l) => (
            <div key={l.id} className="flex w-[108px] shrink-0 flex-col gap-1.5">
              <ListingPhoto listing={l} rough className="aspect-square w-full rounded-md" />
              <div>
                <p className="text-[15px] font-bold text-ink">{money(l.price)}/mo</p>
                <p className="truncate text-sm text-muted">{area(l)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Section label="Account">
        <SettingsRow label="Username" value={profile ? `@${profile.username}` : ''} chevron={false} divider />
        <SettingsRow label="Flocks" value={GROUP_NAME} onClick={() => router.push('/flocks')} divider />
        <SettingsRow label="Preferences" value="Budget, beds, pets" onClick={() => setEditOpen(true)} />
      </Section>

      <Section label="Activity">
        <SettingsRow label="Likes" value={stats ? String(stats.swipes) : '–'} chevron={false} divider />
        <SettingsRow label="Stashed" value={stats ? String(stats.stashed) : '–'} chevron={false} divider />
        <SettingsRow label="Tours" value={stats ? String(stats.tours) : '–'} chevron={false} />
      </Section>

      <Section label="Notifications">
        <SettingsRow label="Flock likes" value="On" divider />
        <SettingsRow label="Tour reminders" value="1 hr before" divider />
        <SettingsRow label="New listings" value="Daily" />
      </Section>

      <Section label="Privacy">
        <SettingsRow label="Who sees my likes" value="My flock" divider />
        <SettingsRow label="Location" value="While using" />
      </Section>

      <Section label="Support">
        <SettingsRow label="Help & feedback" divider />
        <SettingsRow label="Leave flock" danger divider />
        {!DEMO && <SettingsRow label="Log out" danger onClick={async () => (await signOut(), router.replace('/welcome'))} />}
      </Section>

      <PreferencesSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        title="Edit profile"
        showBio
        onSaved={(p) => setProfile((prev) => (prev ? { ...prev, ...p } : prev))}
      />
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="px-8 pt-5 pb-1.5 text-sm font-bold tracking-[0.56px] text-muted uppercase">{label}</h3>
      <div className="rough mx-4 rounded-md">{children}</div>
    </section>
  );
}
