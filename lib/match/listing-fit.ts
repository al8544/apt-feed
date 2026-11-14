// Does a listing fit a flock? Hard constraints only, as a checklist (design doc §7.2). Pure: no database, no network.
// Soft ranking (affordability margin, neighborhood match, move-in, amenities, $/sqft) is a follow-up.
import type { Criterion, Fit, FlockNeeds, Listing } from './types.ts';
import { bedroomsNeeded, combinedBudget, feasibility, suggestedSplit } from './rent-split.ts';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function fit(listing: Listing, flock: FlockNeeds): Fit {
  const combined = combinedBudget(flock.members);
  const need = bedroomsNeeded(flock.bedroomsNeeded, flock.members);
  const budget = feasibility(listing.rentMin, listing.rentMax, combined);

  const criteria: Criterion[] = [
    {
      key: 'budget',
      ok: budget !== 'fails',
      detail:
        budget === 'fits'
          ? `fits the combined budget of ${money(combined)}`
          : budget === 'low-end'
            ? `fits at the low end: from ${money(listing.rentMin)}, up to ${money(listing.rentMax!)}, budget ${money(combined)}`
            : `${money(listing.rentMin - combined)} over the combined budget of ${money(combined)}`,
    },
    { key: 'beds', ok: listing.beds >= need, detail: `${listing.beds} bd for ${need} needed` },
  ];
  if (flock.needsPets)
    criteria.push({
      key: 'pets',
      ok: listing.pets,
      detail: listing.pets == null ? 'pet policy unknown' : listing.pets ? 'pets allowed' : 'no pets',
    });
  if (flock.areas.length)
    criteria.push({
      key: 'area',
      ok: flock.areas.some((a) => same(a, listing.neighborhood)),
      detail: listing.neighborhood,
    });
  if (flock.dealbreakers.length) {
    const hit = listing.tags?.filter((t) => flock.dealbreakers.some((d) => same(d, t))) ?? null;
    criteria.push({
      key: 'dealbreakers',
      ok: hit == null ? null : hit.length === 0,
      detail: hit == null ? 'features unknown' : hit.length ? `has ${hit.join(', ')}` : 'no dealbreakers',
    });
  }

  const known = criteria.filter((c) => c.ok !== null);
  return {
    passes: criteria.every((c) => c.ok !== false), // unknown is a warning, never a fail
    criteria,
    fitPct: known.length ? Math.round((100 * known.filter((c) => c.ok).length) / known.length) : 0,
    suggestedSplit: budget === 'fails' ? [] : suggestedSplit(listing.rentMin, flock.members),
  };
}

export type Miss = { listing: Listing; fit: Fit; failing: string[]; relax: string[] };

// When nothing passes: the listings failing the fewest hard constraints, each with what would let it in.
export function closestMisses(listings: Listing[], flock: FlockNeeds, n = 3): Miss[] {
  const combined = combinedBudget(flock.members);
  return listings
    .map((listing) => {
      const f = fit(listing, flock);
      const failing = f.criteria.filter((c) => c.ok === false).map((c) => c.key);
      const relax = failing.map((key) => {
        if (key === 'budget') {
          const over = listing.rentMin - combined;
          return over <= combined * 0.1
            ? `raise the combined budget by ${money(over)} (${Math.ceil((100 * over) / combined)}%)`
            : `${money(over)} over budget`;
        }
        if (key === 'beds') return `accept ${listing.beds} bedrooms`;
        if (key === 'pets') return 'drop the pets requirement';
        if (key === 'area') return `add ${listing.neighborhood} to your areas`;
        return 'drop a dealbreaker';
      });
      return { listing, fit: f, failing, relax };
    })
    .filter((m) => m.failing.length > 0)
    .sort((a, b) => a.failing.length - b.failing.length || a.listing.rentMin - b.listing.rentMin)
    .slice(0, n);
}
