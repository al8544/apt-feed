import Link from 'next/link';

// Back-to-Flock nav bar (Account, Compare screens).
export default function NavBar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <nav className="relative flex h-11 items-center justify-center mt-[max(8px,env(safe-area-inset-top))]">
      <Link href="/group" className="absolute left-2 flex items-center gap-0.5 text-[19px] text-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/back-left.svg" alt="" width={24} height={24} />
        Flock
      </Link>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {right && <div className="absolute right-4">{right}</div>}
    </nav>
  );
}
