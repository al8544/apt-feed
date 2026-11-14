'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DrawnIcon, { type DrawnIconName } from './DrawnIcon';

const TABS: { href: string; label: string; icon: DrawnIconName; width?: number; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Flock picks', icon: 'home', width: 36, match: (p) => p === '/' },
  { href: '/reels', label: 'For you', icon: 'foryou', match: (p) => p.startsWith('/reels') },
  { href: '/map', label: 'Map', icon: 'map', width: 32, match: (p) => p.startsWith('/map') },
  { href: '/tours', label: 'Tours', icon: 'calendar', match: (p) => p.startsWith('/tours') },
  { href: '/group', label: 'Flock', icon: 'flock', match: (p) => p.startsWith('/group') || p.startsWith('/account') },
];

export default function BottomNav() {
  const pathname = usePathname();
  // For you is a full-bleed photo screen, so the bar goes dark there.
  const dark = pathname.startsWith('/reels');
  return (
    <nav
      className={`rough fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 pb-[env(safe-area-inset-bottom)] ${
        dark ? 'rough-ink' : 'rough-bar'
      }`}
    >
      <ul className="flex h-16 items-start pt-2.5">
        {TABS.map(({ href, label, icon, width, match }) => {
          const active = match(pathname);
          const tone = active ? (dark ? 'text-cream' : 'text-ink') : 'text-icon-off';
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1"
              >
                <DrawnIcon name={icon} size={28} width={width} className={tone} />
                <span className={`size-1 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
