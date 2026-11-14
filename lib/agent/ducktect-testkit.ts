// Shared fixtures for the Ducktect tests (not production code): homes on a line of latitude, places and a fake Vexcel placed relative to them, and an
// in-memory environment.
import { memoryAerialStore } from '../enrich/aerial.ts';
import { memoryPlaceStore, type Place } from '../enrich/places.ts';
import type { Result, Vexcel } from '../enrich/vexcel.ts';
import type { DucktectEnv } from './ducktect.ts';
import { memoryStore, type Needs, type Plan, type UserContext } from './store.ts';

export const U = '00000000-0000-4000-8000-000000000001';
export const COM = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const PLAN = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Communities sit on a line of latitude so "what is around" and "what the satellite shows" can be decided from the coordinates asked about.
export const lat = (c: number) => 34 + c / 100; // about 1.1 km apart, so each home's surroundings are its own
export const plan = (n: number, c: number, rent: number, beds: number, extra: Partial<Plan> = {}): Plan => ({
  id: PLAN(n), address: `${n} Test St`, rentMin: rent, rentMax: null, beds, baths: 2, sqft: 1000, pets: null, neighborhood: '', communityName: `Place ${c}`,
  communityId: COM(c), lat: lat(c), lng: -118.3, ...extra,
});
export const needs = (budget: number | null = 1500, size = 3): Needs => ({ size, members: [{ userId: U, status: 'active', budgetMax: budget }], bedroomsNeeded: null, areas: [], needsPets: false, dealbreakers: [] });

// A place on the map, `northM` metres north of community `c` (a shop, a gym, a hospital: anything the model might search for).
export const spot = (name: string, kind: string, c: number, northM = 100, text = ''): Place & { text: string } => ({
  id: `node/${name}`, name, kind, areaM2: null, closed: false, pts: [[lat(c) + northM / 111_320, -118.3]], text,
});

// A Vexcel that finds a label at the communities listed for it (`found: { 'swimming pool': [2] }`), counts its calls, and can be told to fail.
export function fakeVexcel(found: Record<string, number[]>, fail?: 'forbidden' | 'network') {
  const calls = { detect: 0, property: 0, labels: [] as string[][] };
  const v = {
    async detect(la: number, _lng: number, labels: string[]): Promise<Result<unknown>> {
      calls.detect++;
      calls.labels.push(labels);
      if (fail) return { ok: false, reason: fail };
      const c = Math.round((la - 34) * 100);
      const hit = (l: string) => (found[l] ?? []).includes(c);
      return { ok: true, value: { imagery: { collection: 'test', capturedAt: '2025-12-10' }, byLabel: Object.fromEntries(labels.map((l) => [l, { count: hit(l) ? 1 : 0, maxConfidence: hit(l) ? 0.8 : 0 }])) } };
    },
    async property(): Promise<Result<unknown>> {
      calls.property++;
      return fail ? { ok: false, reason: fail } : { ok: true, value: { parcels: 1, pool: { detected: false, maxScore: null }, treeCoverPct: 12, treeCoverMaxPct: 12, collection: 'test' } };
    },
  } as unknown as Vexcel;
  return { v, calls };
}

export function setup(
  plans: Plan[],
  opts: {
    withPool?: number[]; found?: Record<string, number[]>; fail?: 'forbidden' | 'network'; budget?: number; flock?: boolean; needs?: Needs; viewport?: DucktectEnv['viewport'];
    defaults?: DucktectEnv['defaults']; noVexcel?: boolean; places?: (Place & { text?: string })[]; noPlaces?: boolean; context?: Partial<UserContext>;
  } = {},
) {
  const store = memoryStore({ plans, needs: opts.needs ?? needs(), context: opts.context });
  const vx = fakeVexcel({ 'swimming pool': opts.withPool ?? [], ...(opts.found ?? {}) }, opts.fail);
  const env: DucktectEnv = {
    store, aerialStore: memoryAerialStore(), places: opts.noPlaces ? undefined : memoryPlaceStore(opts.places ?? []), vexcel: opts.noVexcel ? undefined : vx.v, budget: { calls: opts.budget ?? 50 },
    userId: U, flockId: opts.flock ? '20000000-0000-4000-8000-000000000001' : null, viewport: opts.viewport, defaults: opts.defaults,
  };
  return { env, store, vx };
}
