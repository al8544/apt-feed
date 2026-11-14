// Display helpers shared by screens. Pure formatting only — data comes from lib/api.ts.
import type { Listing, Profile } from './api';


export const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// 3450 -> "$3.45k", 2800 -> "$2.8k"
export const shortPrice = (n: number) => `$${Math.round(n / 10) / 100}k`;

export const specs = (l: Pick<Listing, 'beds' | 'baths' | 'sqft'>) =>
  `${l.beds === 0 ? 'Studio' : `${l.beds} bd`} · ${l.baths} ba${l.sqft ? ` · ${l.sqft.toLocaleString('en-US')} sqft` : ''}`;

// Where a listing is. The CoStar kit has no neighborhood yet, so fall back to the city.
export const area = (l: Pick<Listing, 'neighborhood'>) => l.neighborhood ?? 'Los Angeles';

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

// Straight-line miles between two points (haversine). Matches flock_pin_distances (migrations 0018, 0019).
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export const miles = (n: number) => `${n < 10 ? n.toFixed(1) : Math.round(n)} mi`;

// What the thumbs-down toast says once the flock agent has re-checked the shortlist.
export function feedbackMessage(r: { outcome: string; added: number; removed: number }) {
  if (r.outcome === 'no-budget') return 'Add a budget in Flock preferences to refresh your picks';
  if (r.outcome === 'nothing-fits') return 'Nothing else fits · kept your picks';
  if (r.outcome === 'unchanged') return 'Your picks already fit · nothing changed';
  const parts = [r.added && `${r.added} new`, r.removed && `${r.removed} dropped`].filter(Boolean);
  return `Picks updated${parts.length ? ` · ${parts.join(', ')}` : ''}`;
}
