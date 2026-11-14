// What the agent's tools may read and write. A small interface so the tools are tested without a database
// (memoryStore) and run in production on a USER-SCOPED Supabase client (supabaseStore): row-level security applies,
// and the service-role key is never used here (docs/DESIGN.md §8.4).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Criterion, FlockNeeds, Listing as MatchListing } from '../match/types.ts';

export type Plan = MatchListing & { address: string; baths: number; sqft: number | null; communityName: string | null };
export type Needs = FlockNeeds & { size: number };
export type SavedPick = { listingId: string; explanation: string; criteria: Criterion[] };
export type ShortlistRow = { listingId: string; explanation: string | null; criteria: Criterion[] | null; status: string };

export interface AgentStore {
  flockNeeds(flockId: string): Promise<Needs>;
  searchPlans(q: { maxRent: number; beds: number; limit: number }): Promise<Plan[]>;
  getPlans(ids: string[]): Promise<Plan[]>;
  saveShortlist(flockId: string, picks: SavedPick[], runId?: string): Promise<number>;
  shortlist(flockId: string): Promise<ShortlistRow[]>;
  invite(flockId: string, username: string): Promise<string>;
  recordFeedback(flockId: string, userId: string, listingId: string, reason: string): Promise<void>;
}

const COLS = 'id, address, price, beds, baths, sqft, pets, neighborhood, community:communities(name)';
type Row = { id: string; address: string; price: number; beds: number; baths: number; sqft: number | null; pets: boolean | null; neighborhood: string | null; community: { name: string | null } | null };
const toPlan = (r: Row): Plan => ({
  id: r.id, address: r.address, rentMin: r.price, rentMax: null, beds: r.beds, baths: r.baths, sqft: r.sqft, pets: r.pets,
  neighborhood: r.neighborhood ?? '', // unknown until the kit gets neighborhoods; the agent does not filter on area yet
  communityName: r.community?.name ?? null,
});

export function supabaseStore(db: SupabaseClient): AgentStore {
  const ok = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
    return r.data as T;
  };
  return {
    async flockNeeds(flockId) {
      const f = ok(await db.from('flocks').select('bedrooms_needed').eq('id', flockId).single(), 'flock') as { bedrooms_needed: number | null } | null;
      const rows = ok(
        await db.from('flock_members').select('user_id, status, user:profiles(budget_max, pets)').eq('flock_id', flockId).eq('status', 'active'),
        'members',
      ) as unknown as { user_id: string; status: 'active'; user: { budget_max: number | null; pets: boolean | null } | null }[];
      return {
        size: rows.length,
        members: rows.map((r) => ({ userId: r.user_id, status: r.status, budgetMax: r.user?.budget_max ?? null })),
        bedroomsNeeded: f?.bedrooms_needed ?? null,
        areas: [], // neighborhoods are unknown in the data for now
        needsPets: rows.some((r) => r.user?.pets),
        dealbreakers: [],
      };
    },
    async searchPlans({ maxRent, beds, limit }) {
      const rows = ok(
        await db.from('listings').select(COLS).eq('source', 'costar').eq('active', true).gte('beds', beds).lte('price', maxRent).gt('price', 500).order('price', { ascending: false }).limit(limit),
        'search',
      ) as unknown as Row[];
      return rows.map(toPlan);
    },
    async getPlans(ids) {
      return (ok(await db.from('listings').select(COLS).in('id', ids), 'plans') as unknown as Row[]).map(toPlan);
    },
    async saveShortlist(flockId, picks, runId) {
      const rows = picks.map((p) => ({ flock_id: flockId, listing_id: p.listingId, explanation: p.explanation, criteria: p.criteria, status: 'active', added_by: 'agent', agent_run_id: runId ?? null }));
      ok(await db.from('shortlist').upsert(rows, { onConflict: 'flock_id,listing_id' }), 'shortlist');
      return rows.length;
    },
    async shortlist(flockId) {
      const rows = ok(await db.from('shortlist').select('listing_id, explanation, criteria, status').eq('flock_id', flockId).order('created_at'), 'shortlist') as { listing_id: string; explanation: string | null; criteria: Criterion[] | null; status: string }[];
      return rows.map((r) => ({ listingId: r.listing_id, explanation: r.explanation, criteria: r.criteria, status: r.status }));
    },
    async invite(flockId, username) {
      return ok(await db.rpc('invite_to_flock', { p_flock_id: flockId, p_username: username }), 'invite') as string;
    },
    async recordFeedback(flockId, userId, listingId, reason) {
      ok(await db.from('flock_feedback').insert({ flock_id: flockId, user_id: userId, listing_id: listingId, reason }), 'feedback');
      await db.from('shortlist').update({ status: 'contested' }).eq('flock_id', flockId).eq('listing_id', listingId);
    },
  };
}

// In memory, for tests and the offline smoke run.
export function memoryStore(seed: { plans: Plan[]; needs: Needs }): AgentStore & { saved: Map<string, SavedPick>; invited: string[]; feedback: string[]; flocksSeen: string[] } {
  const saved = new Map<string, SavedPick>(), invited: string[] = [], feedback: string[] = [], flocksSeen: string[] = [];
  return {
    saved, invited, feedback, flocksSeen,
    async flockNeeds(flockId) { flocksSeen.push(flockId); return seed.needs; },
    async searchPlans({ maxRent, beds, limit }) { return seed.plans.filter((p) => p.rentMin <= maxRent && p.beds >= beds).slice(0, limit); },
    async getPlans(ids) { return seed.plans.filter((p) => ids.includes(p.id)); },
    async saveShortlist(_f, picks) { picks.forEach((p) => saved.set(p.listingId, p)); return picks.length; },
    async shortlist() { return [...saved.values()].map((p) => ({ listingId: p.listingId, explanation: p.explanation, criteria: p.criteria, status: 'active' })); },
    async invite(_f, username) { invited.push(username); return 'invited'; },
    async recordFeedback(_f, _u, listingId, reason) { feedback.push(`${listingId}:${reason}`); },
  };
}
