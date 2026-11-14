'use client';
import { useEffect, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { CURRENT_USER_ID, getGroupMembers, switchUser, type Member } from '@/lib/api';
import Avatar from './Avatar';
import Sheet from './Sheet';

// Demo-only "who are you?" picker: lets two phones act as two different crew members.
export default function UserSwitcher() {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    if (open && !members) getGroupMembers().then(setMembers).catch(() => setMembers([]));
  }, [open, members]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink"
      >
        <Users size={16} />
        Switch user
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Who are you?">
        <div className="flex flex-col pb-2">
          {!members ? (
            <p className="py-6 text-center text-[13px] text-muted">Loading crew…</p>
          ) : (
            members.map((m) => (
              <button
                key={m.id}
                onClick={() => (m.id === CURRENT_USER_ID ? setOpen(false) : switchUser(m.id))}
                className="flex items-center gap-3 py-2.5 text-left"
              >
                <Avatar user={m} size={40} />
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{m.display_name}</span>
                  <span className="block text-[13px] text-muted">@{m.username}</span>
                </span>
                {m.id === CURRENT_USER_ID && <Check size={20} className="text-accent" />}
              </button>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
}
