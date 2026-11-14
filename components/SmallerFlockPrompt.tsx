'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GROUP_ID, getGroupMembers, getLeftMembers, type Profile } from '@/lib/api';
import { firstName } from '@/lib/format';
import Sheet from './Sheet';
import { Button } from './AuthUI';

// "Continue as a smaller flock?" (ticket T10): shown once to the members who stay, after someone leaves.
// Budgets, fit and scores already recompute on read from the active members (docs/DESIGN.md §7.3).
const seenKey = () => `flock.leftSeen.${GROUP_ID}`;

function seen(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(seenKey()) ?? '[]');
  } catch {
    return [];
  }
}

export default function SmallerFlockPrompt() {
  const router = useRouter();
  const [left, setLeft] = useState<Profile[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    getLeftMembers()
      .then((people) => setLeft(people.filter((p) => !seen().includes(p.id))))
      .catch(() => {});
    getGroupMembers().then((m) => setCount(m.length)).catch(() => {});
  }, []);

  function acknowledge(then?: string) {
    try {
      window.localStorage.setItem(seenKey(), JSON.stringify([...seen(), ...left.map((p) => p.id)]));
    } catch {
      /* storage blocked: it may show again next visit */
    }
    setLeft([]);
    if (then) router.push(then);
  }

  const names = left.map(firstName);
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return (
    <Sheet
      open={left.length > 0 && count > 0}
      onClose={() => acknowledge()}
      title="Continue as a smaller flock?"
      subtitle={`${who} left the flock.`}
    >
      <div className="flex flex-col gap-3 pb-1">
        <p className="text-lg text-ink">
          {count === 1
            ? "It's just you for now. Budgets and fit now use your numbers only. Invite someone to keep hunting together."
            : `Budgets, fit and scores now use the ${count} of you who are still here. You can keep going, or invite someone to take the spot.`}
        </p>
        <Button onClick={() => acknowledge()}>{count === 1 ? 'Continue for now' : `Continue as ${count}`}</Button>
        <Button secondary onClick={() => acknowledge('/invite')}>
          Invite someone new
        </Button>
      </div>
    </Sheet>
  );
}
