// Compare screen math — follows the "Dev Note · Custom score weights" frame in the Figma file.
// Pure functions only; tested in lib/compare.test.ts.
import type { GroupListing } from './api';

// Flock score: 70% share of the flock that swiped right, 30% fit with everyone's prefs.
export const flockScore = (l: GroupListing, groupSize: number) =>
  Math.round(70 * (groupSize ? l.likes / groupSize : 0) + 0.3 * l.match.pct);

export type MetricKey = 'rent' | 'bedBath' | 'sqft' | 'ppsf' | 'flockScore' | 'votes' | 'pets';

// Only metrics the listing data has. Commute, laundry, move-in, lease length and broker fee
// from the design need new listing fields first.
export const METRICS: { key: MetricKey; label: string; lowerIsBetter?: boolean }[] = [
  { key: 'rent', label: 'Rent', lowerIsBetter: true },
  { key: 'bedBath', label: 'Bed / bath' },
  { key: 'sqft', label: 'Sq ft' },
  { key: 'ppsf', label: '$ / sq ft', lowerIsBetter: true },
  { key: 'flockScore', label: 'Flock score' },
  { key: 'votes', label: 'Flock votes' },
  { key: 'pets', label: 'Pets' },
];

export function metricValue(key: MetricKey, l: GroupListing, groupSize: number): number {
  switch (key) {
    case 'rent':
      return l.price;
    case 'bedBath':
      return l.beds + l.baths / 10; // beds first, baths break ties
    case 'sqft':
      return l.sqft ?? 0; // unknown size ranks last; shown as a dash
    case 'ppsf':
      return l.sqft ? l.price / l.sqft : Infinity;
    case 'flockScore':
      return flockScore(l, groupSize);
    case 'votes':
      return l.likes;
    case 'pets':
      return l.pets ? 1 : 0;
  }
}

export type Weights = Partial<Record<MetricKey, number>>;

export function evenWeights(keys: MetricKey[]): Weights {
  return Object.fromEntries(keys.map((k) => [k, 1 / keys.length]));
}

// Set slider k to v (clamped 0..1) and rescale the others so the total stays 1.
export function setWeight(w: Weights, k: MetricKey, v: number): Weights {
  const keys = Object.keys(w) as MetricKey[];
  const others = keys.filter((j) => j !== k);
  if (!others.length) return { [k]: 1 };
  v = Math.min(1, Math.max(0, v));
  const rest = 1 - (w[k] ?? 0);
  const next: Weights = { [k]: v };
  for (const j of others) next[j] = rest > 0 ? ((w[j] ?? 0) * (1 - v)) / rest : (1 - v) / others.length;
  return next;
}

// Turn a metric on (joins at 1/n, others scale by 1 - 1/n) or off (others renormalize).
export function toggleWeight(w: Weights, k: MetricKey, on: boolean): Weights {
  const keys = Object.keys(w) as MetricKey[];
  if (on) {
    if (k in w) return w;
    const n = keys.length + 1;
    const next: Weights = Object.fromEntries(keys.map((j) => [j, (w[j] ?? 0) * (1 - 1 / n)]));
    next[k] = 1 / n;
    return next;
  }
  const rest = keys.filter((j) => j !== k);
  const sum = rest.reduce((s, j) => s + (w[j] ?? 0), 0);
  return Object.fromEntries(rest.map((j) => [j, sum > 0 ? (w[j] ?? 0) / sum : 1 / rest.length]));
}

// Min-max normalize each metric across the places being compared (0..1, 1 = best). All tied → 0.5.
export function normalized(key: MetricKey, places: GroupListing[], groupSize: number, lowerIsBetter = false) {
  const vals = places.map((l) => metricValue(key, l, groupSize));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  return vals.map((v) => (hi === lo ? 0.5 : lowerIsBetter ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo)));
}

// Your score per place: round(100 · Σ wᵢ · normᵢ).
export function yourScores(places: GroupListing[], w: Weights, groupSize: number): number[] {
  const totals = places.map(() => 0);
  for (const m of METRICS) {
    const wk = w[m.key];
    if (!wk) continue;
    normalized(m.key, places, groupSize, m.lowerIsBetter).forEach((n, i) => (totals[i]! += wk * n));
  }
  return totals.map((t) => Math.round(100 * t));
}
