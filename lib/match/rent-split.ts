// Budget feasibility and rent split (design doc §7.1). Pure: no database, no network.
import type { Member, Share } from './types.ts';

export const activeMembers = (members: Member[]) => members.filter((m) => m.status === 'active');

// Sum of active members' per-person caps. A missing cap counts as 0: we never assume someone's budget.
export const combinedBudget = (members: Member[]) =>
  activeMembers(members).reduce((sum, m) => sum + (m.budgetMax ?? 0), 0);

export type Feasibility = 'fits' | 'low-end' | 'fails';

// rentMin <= combined passes; if rentMax is over, it only "fits at the low end" (a warning).
export function feasibility(rentMin: number, rentMax: number | null, combined: number): Feasibility {
  if (rentMin > combined) return 'fails';
  return rentMax != null && rentMax > combined ? 'low-end' : 'fits';
}

// Whole-dollar split that always adds up to `rent`: floor each share, then give the leftover dollars to the
// largest remainders (plain rounding can lose a dollar: $4,500 over 1500/1800/1400 rounds to $4,499).
function apportion(rent: number, weights: { userId: string; w: number }[]): Share[] {
  const total = weights.reduce((s, x) => s + x.w, 0);
  const exact = weights.map((x) => ({ userId: x.userId, v: (rent * x.w) / total }));
  const shares = exact.map((x) => ({ userId: x.userId, share: Math.floor(x.v) }));
  let left = rent - shares.reduce((s, x) => s + x.share, 0);
  const order = exact.map((x, i) => ({ i, r: x.v - Math.floor(x.v) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) if (left-- > 0) shares[i]!.share += 1;
  return shares;
}

// Estimated rent per person. Equal split if it fits every cap, otherwise share = rent × cap ÷ combined,
// which keeps everyone under their own cap whenever the rent fits.
export function suggestedSplit(rent: number, members: Member[]): Share[] {
  const active = activeMembers(members);
  if (!active.length) return [];
  const equal = apportion(rent, active.map((m) => ({ userId: m.userId, w: 1 })));
  const caps = new Map(active.map((m) => [m.userId, m.budgetMax]));
  const equalFits = equal.every((s) => caps.get(s.userId) != null && s.share <= caps.get(s.userId)!);
  if (equalFits || combinedBudget(active) === 0) return equal;
  return apportion(rent, active.map((m) => ({ userId: m.userId, w: m.budgetMax ?? 0 })));
}

// Default one bedroom per active member; a flock can set fewer (couples, shared rooms).
export const bedroomsNeeded = (set: number | null, members: Member[]) => set ?? activeMembers(members).length;
