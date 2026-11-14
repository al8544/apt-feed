'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Clapperboard, Map, Calendar, Users, type LucideIcon } from 'lucide-react';

const TABS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { href: '/reels', label: 'Reels', icon: Clapperboard, match: (p) => p.startsWith('/reels') },
  { href: '/map', label: 'Map', icon: Map, match: (p) => p.startsWith('/map') },
  { href: '/tours', label: 'Tours', icon: Calendar, match: (p) => p.startsWith('/tours') },
  { href: '/group', label: 'Group', icon: Users, match: (p) => p.startsWith('/group') || p.startsWith('/account') },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t-[0.5px] border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-16 items-start pt-2">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1"
              >
                <Icon size={26} strokeWidth={active ? 2.4 : 1.6} className={active ? 'text-ink' : 'text-muted'} />
                <span className={`size-1 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
