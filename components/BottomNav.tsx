'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: '/picks', label: 'Flock picks', icon: 'nest', match: (p) => p.startsWith('/picks') || p.startsWith('/listing') },
  { href: '/reels', label: 'For you', icon: 'feather', match: (p) => p.startsWith('/reels') },
  { href: '/map', label: 'Map', icon: 'migration', match: (p) => p.startsWith('/map') },
  { href: '/tours', label: 'Calendar', icon: 'calendarTab', match: (p) => p.startsWith('/tours') },
  {
    href: '/group',
    label: 'Flock',
    icon: 'flock',
    match: (p) => p.startsWith('/group') || p.startsWith('/stash') || p.startsWith('/members') || p.startsWith('/invite') || p.startsWith('/account') || p.startsWith('/compare'),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const dark = pathname.startsWith('/reels') || pathname.startsWith('/map/'); // full-bleed photo screens
  return (
    <nav
      className={`rough fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 pb-[env(safe-area-inset-bottom)] ${
        dark ? '[--fill:var(--color-ink)] group-has-[[data-light]]/app:[--fill:var(--color-bar)]' : '[--fill:var(--color-bar)]'
      }`}
    >
      <ul className="flex h-16 items-start pt-2">
        {TABS.map(({ href, label, icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 ${active ? (dark ? 'text-card group-has-[[data-light]]/app:text-ink' : 'text-ink') : 'text-faded'}`}
              >
                <Icon name={icon} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active ? '/icons/dot-on.svg' : '/icons/dot-off.svg'} alt="" width={4} height={4} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
