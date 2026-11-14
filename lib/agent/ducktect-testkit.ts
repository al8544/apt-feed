// Shared fixtures for the Ducktect tests (not production code): places on a line of latitude, a fake Vexcel, and an in-memory environment.
import { memoryAerialStore } from '../enrich/aerial.ts';
import type { Result, Vexcel } from '../enrich/vexcel.ts';
import type { DucktectEnv } from './ducktect.ts';
import { memoryStore, type Needs, type Plan } from './store.ts';

export const U = '00000000-0000-4000-8000-000000000001';
export const COM = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const PLAN = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Communities sit on a line of latitude so "has a pool" can be decided from the coordinates the fake Vexcel is asked about.
export const lat = (c: number) => 34 + c / 1000;
export const plan = (n: number, c: number, rent: number, beds: number, extra: Partial<Plan> = {}): Plan => ({
  id: PLAN(n), address: `${n} Test St`, rentMin: rent, rentMax: null, beds, baths: 2, sqft: 1000, pets: null, neighborhood: '', communityName: `Place ${c}`,
  communityId: COM(c), lat: lat(c), lng: -118.3, ...extra,
});
export const needs = (budget: number | null = 1500, size = 3): Needs => ({ size, members: [{ userId: U, status: 'active', budgetMax: budget }], bedroomsNeeded: null, areas: [], needsPets: false, dealbreakers: [] });

// A Vexcel that says "pool" for the communities in `withPool`, counts its calls, and can be told to fail.
export function fakeVexcel(withPool: number[], fail?: 'forbidden' | 'network') {
  const calls = { detect: 0, property: 0 };
  const v = {
    async detect(la: number, _lng: number, labels: string[]): Promise<Result<unknown>> {
      calls.detect++;
      if (fail) return { ok: false, reason: fail };
      const c = Math.round((la - 34) * 1000);
      return { ok: true, value: { imagery: { collection: 'test', capturedAt: '2025-12-10' }, byLabel: Object.fromEntries(labels.map((l) => [l, { count: withPool.includes(c) && l === 'swimming pool' ? 1 : 0, maxConfidence: withPool.includes(c) && l === 'swimming pool' ? 0.8 : 0 }])) } };
    },
    async property(): Promise<Result<unknown>> {
      calls.property++;
      return fail ? { ok: false, reason: fail } : { ok: true, value: { parcels: 1, pool: { detected: false, maxScore: null }, treeCoverPct: 12, treeCoverMaxPct: 12, collection: 'test' } };
    },
  } as unknown as Vexcel;
  return { v, calls };
}

export function setup(plans: Plan[], opts: { withPool?: number[]; fail?: 'forbidden' | 'network'; budget?: number; flock?: boolean; needs?: Needs; viewport?: DucktectEnv['viewport']; defaults?: DucktectEnv['defaults']; noVexcel?: boolean } = {}) {
  const store = memoryStore({ plans, needs: opts.needs ?? needs() });
  const vx = fakeVexcel(opts.withPool ?? [], opts.fail);
  const env: DucktectEnv = {
    store, aerialStore: memoryAerialStore(), vexcel: opts.noVexcel ? undefined : vx.v, budget: { calls: opts.budget ?? 50 },
    userId: U, flockId: opts.flock ? '20000000-0000-4000-8000-000000000001' : null, viewport: opts.viewport, defaults: opts.defaults,
  };
  return { env, store, vx };
}
