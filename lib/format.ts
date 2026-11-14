// Display helpers shared by screens. Pure formatting only — data comes from lib/api.ts.
import type { Listing, Profile } from './api';

export const GROUP_NAME = 'Brooklyn Flock';

export const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// 3450 -> "$3.45k", 2800 -> "$2.8k"
export const shortPrice = (n: number) => `$${Math.round(n / 10) / 100}k`;

export const specs = (l: Pick<Listing, 'beds' | 'baths' | 'sqft'>) =>
  `${l.beds} bd · ${l.baths} ba · ${l.sqft.toLocaleString('en-US')} sqft`;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export const firstName = (p: Pick<Profile, 'display_name'>) => p.display_name.split(/\s+/)[0] ?? p.display_name;

// ISO timestamp -> "now", "5m", "2h", "3d", "4w"
export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// "Williamsburg", "Williamsburg +2"
export function listSummary(items: string[]) {
  if (!items.length) return 'Any';
  return items.length === 1 ? items[0]! : `${items[0]} +${items.length - 1}`;
}

// Shared preferences across members: budget range, strictest beds, union of neighborhoods, earliest move-in.
export function groupPrefs(members: Profile[]) {
  const budgets = members.map((m) => m.budget_max).filter((b): b is number => b != null);
  const beds = Math.max(0, ...members.map((m) => m.beds_min ?? 0));
  const hoods = [...new Set(members.flatMap((m) => m.neighborhoods ?? []))];
  const moveIns = members.map((m) => m.move_in).filter((d): d is string => !!d).sort();
  return {
    budgetMin: budgets.length ? Math.min(...budgets) : null,
    budgetMax: budgets.length ? Math.max(...budgets) : null,
    beds,
    hoods,
    moveIn: moveIns[0] ?? null,
    pets: members.some((m) => m.pets),
  };
}

// move_in is a date-only string ("2027-01-01"); parse as local so it doesn't shift a day.
export function parseDateOnly(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, day ?? 1);
}
