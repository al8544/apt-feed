'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CURRENT_USER_ID, getGroupMembers, type Member } from '@/lib/api';
import Avatar from '@/components/Avatar';
import NavBar from '@/components/NavBar';

// Figma "05c Members · Manage". shortcut: no Remove / Leave flock, the API has no group-membership writes.
export default function MembersPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  useEffect(() => {
    getGroupMembers().then(setMembers).catch(() => setMembers([]));
  }, []);
  const admin = members?.find((m) => m.role === 'admin');

  return (
    <main className="min-h-dvh bg-card pb-6">
      <NavBar title="Members" />
      <p className="px-4 pb-2 text-[15px] text-muted">
        {members ? `${members.length} ${members.length === 1 ? 'friend' : 'friends'}` : ' '}
        {admin && ` · ${admin.display_name} started this flock`}
      </p>
      {!members
        ? [0, 1, 2].map((i) => <div key={i} className="mx-4 my-2 h-11 animate-pulse rounded-md bg-surface" />)
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
                  {m.role === 'admin' ? ' · Admin' : ` · ${m.swipeCount} ${m.swipeCount === 1 ? 'like' : 'likes'}`}
                </p>
              </div>
            </div>
          ))}
      <Link href="/invite" className="rough mx-4 mt-4 block rounded-lg py-3.5 text-center text-xl font-bold text-card [--fill:var(--color-ink)]">
        Invite friends
      </Link>
    </main>
  );
}
