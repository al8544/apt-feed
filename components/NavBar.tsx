'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Back nav bar; goes back to Flock unless told otherwise.
export default function NavBar({
  title,
  right,
  back = { href: '/group', label: 'Flock' },
}: {
  title: string;
  right?: React.ReactNode;
  back?: { href: string; label: string; history?: boolean }; // history: go back in browser history when there is some
}) {
  const router = useRouter();
  return (
    <nav className="relative flex h-11 items-center justify-center mt-[max(8px,env(safe-area-inset-top))]">
      <Link
        href={back.href}
        onClick={(e) => {
          if (!back.history || window.history.length < 2) return;
          e.preventDefault();
          router.back();
        }}
        className="absolute left-2 flex items-center gap-0.5 text-[19px] text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/back-left.svg" alt="" width={24} height={24} />
        {back.label}
      </Link>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {right && <div className="absolute right-4">{right}</div>}
    </nav>
  );
}
