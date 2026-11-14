// What the agent's tools may read and write. A small interface so the tools are tested without a database
// (memoryStore) and run in production on a USER-SCOPED Supabase client (supabaseStore): row-level security applies,
// and the service-role key is never used here (docs/DESIGN.md §8.4).
import type { SupabaseClient } from '@supabase/supabase-js';
import { combinedBudget } from '../match/rent-split.ts';
import type { Criterion, FlockNeeds, Listing as MatchListing } from '../match/types.ts';

// communityId, lat and lng are what the aerial check needs (Vexcel looks at a place, not at a floor plan); optional so older callers and tests need none.
export type Plan = MatchListing & { address: string; baths: number; sqft: number | null; communityName: string | null; communityId?: string | null; lat?: number | null; lng?: number | null; distanceMi?: number };
export type Viewport = { south: number; west: number; north: number; east: number };
// The person's own real metrics, for Ducktect to reason about their day-to-day life (docs/DESIGN.md §8.9). It is read as the user, so row-level
// security applies: you only ever get your own profile, and from your flock only what the group shares (its size and combined budget, not anyone's
// private details). Free text is what the person wrote: it is DATA for the model to read, never instructions.
export type UserContext = {
  budgetMax: number | null; // this person's own cap per month as their share
  bedsMin: number | null; pets: boolean | null; neighborhoods: string[]; moveIn: string | null;
  bio: string | null; about: string | null; lookingFor: string | null; dealbreakers: string | null;
  habits: Record<string, unknown>; dealbreakerTags: string[];
  flock: { size: number; combinedBudget: number; bedroomsNeeded: number | null; about: string | null; lookingFor: string | null } | null; // null when solo
};
// What Ducktect asks of the data (docs/DESIGN.md §8.9): hard filters, an optional area, and a cap on the rows pulled.
export type CandidateQuery = { maxRent?: number; beds?: number; pets?: boolean; viewport?: Viewport; limit: number };
export type Needs = FlockNeeds & { size: number; membersChangedAt?: string | null }; // ISO time the newest active member joined; a budget-based reason older than this is stale
export type SavedPick = { listingId: string; explanation: string; criteria: Criterion[] };
export type ShortlistRow = { listingId: string; explanation: string | null; criteria: Criterion[] | null; status: string };

export interface AgentStore {
  flockNeeds(flockId: string): Promise<Needs>;
  searchPlans(q: { maxRent: number; beds: number; limit: number }): Promise<Plan[]>;
  findCandidates(q: CandidateQuery): Promise<{ plans: Plan[]; total: number }>; // total = how many pass, before the cap
  soloNeeds(userId: string): Promise<Needs>; // Ducktect with no flock: you are a flock of one
  userContext(userId: string, flockId: string | null): Promise<UserContext>; // who is asking: their real profile, and their flock's shared facts
  getPlans(ids: string[]): Promise<Plan[]>;
  saveShortlist(flockId: string, picks: SavedPick[], runId?: string): Promise<number>;
  shortlist(flockId: string): Promise<ShortlistRow[]>;
  invite(flockId: string, username: string): Promise<string>;
  recordFeedback(flockId: string, userId: string, listingId: string, reason: string): Promise<void>;
  distances(flockId: string, ids: string[]): Promise<Map<string, number>>; // farthest straight-line miles to any member's pin; empty when nobody has set one
  feedbackFor(flockId: string): Promise<{ listingId: string; reason: string; userId: string; createdAt: string }[]>;
  retireShortlist(flockId: string, keepIds: string[]): Promise<void>; // the agent's earlier picks that are not in keepIds are marked removed
}

const COLS = 'id, address, price, beds, baths, sqft, pets, neighborhood, community_id, lat, lng, community:communities(name)';
type Row = { id: string; address: string; price: number; beds: number; baths: number; sqft: number | null; pets: boolean | null; neighborhood: string | null; community_id: string | null; lat: number | null; lng: number | null; community: { name: string | null } | null };
const toPlan = (r: Row): Plan => ({
  id: r.id, address: r.address, rentMin: r.price, rentMax: null, beds: r.beds, baths: r.baths, sqft: r.sqft, pets: r.pets,
  neighborhood: r.neighborhood ?? '', // unknown until the kit gets neighborhoods; the agent does not filter on area yet
  communityName: r.community?.name ?? null, communityId: r.community_id, lat: r.lat, lng: r.lng,
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
        await db.from('flock_members').select('user_id, status, created_at, user:profiles(budget_max, pets)').eq('flock_id', flockId).eq('status', 'active'),
        'members',
      ) as unknown as { user_id: string; status: 'active'; created_at: string; user: { budget_max: number | null; pets: boolean | null } | null }[];
      return {
        size: rows.length,
        // shortcut: the member row's creation time stands in for "joined" (an invite that was accepted later counts from the invite).
        membersChangedAt: rows.map((r) => r.created_at).reduce<string | null>((latest, t) => (!latest || Date.parse(t) > Date.parse(latest) ? t : latest), null),
        members: rows.map((r) => ({ userId: r.user_id, status: r.status, budgetMax: r.user?.budget_max ?? null })),
        bedroomsNeeded: f?.bedrooms_needed ?? null,
        areas: [], // neighborhoods are unknown in the data for now
        needsPets: rows.some((r) => r.user?.pets),
        dealbreakers: [],
      };
    },
    async searchPlans({ maxRent, beds, limit }) {
      const rows = ok(
        await db.from('listings').select(COLS).eq('source', 'costar').eq('active', true).gte('beds', beds).lte('price', maxRent).gt('price', 500).order('price', { ascending: false }).order('id').limit(limit), // id breaks ties, so the same flock always gets the same candidates
        'search',
      ) as unknown as Row[];
      return rows.map(toPlan);
    },
    async findCandidates({ maxRent, beds, pets, viewport, limit }) {
      let q = db.from('listings').select(COLS, { count: 'exact' }).eq('source', 'costar').eq('active', true).gt('price', 500);
      if (beds != null) q = q.gte('beds', beds);
      if (maxRent != null) q = q.lte('price', maxRent);
      if (pets) q = q.or('pets.is.null,pets.eq.true'); // unknown is not "no": a place whose policy the kit omits stays in
      if (viewport) q = q.gte('lat', viewport.south).lte('lat', viewport.north).gte('lng', viewport.west).lte('lng', viewport.east);
      const r = await q.order('price', { ascending: false }).limit(limit);
      if (r.error) throw new Error(`candidates: ${r.error.message}`);
      return { plans: (r.data as unknown as Row[]).map(toPlan), total: r.count ?? r.data.length };
    },
    async soloNeeds(userId) {
      const p = ok(await db.from('profiles').select('budget_max, pets').eq('id', userId).maybeSingle(), 'profile') as { budget_max: number | null; pets: boolean | null } | null;
      return { size: 1, members: [{ userId, status: 'active' as const, budgetMax: p?.budget_max ?? null }], bedroomsNeeded: null, areas: [], needsPets: !!p?.pets, dealbreakers: [] };
    },
    async userContext(userId, flockId) {
      const clip = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 600) : null);
      const p = ok(
        await db.from('profiles').select('budget_max, beds_min, pets, neighborhoods, move_in, bio, about, looking_for, dealbreakers_text, habits, dealbreaker_tags').eq('id', userId).maybeSingle(),
        'profile',
      ) as Record<string, unknown> | null;
      let flock: UserContext['flock'] = null;
      if (flockId) {
        const [needs, f] = [await this.flockNeeds(flockId), ok(await db.from('flocks').select('about, looking_for').eq('id', flockId).maybeSingle(), 'flock') as { about: string | null; looking_for: string | null } | null];
        flock = { size: needs.size, combinedBudget: combinedBudget(needs.members), bedroomsNeeded: needs.bedroomsNeeded, about: clip(f?.about), lookingFor: clip(f?.looking_for) };
      }
      return {
        budgetMax: (p?.budget_max as number | null) ?? null, bedsMin: (p?.beds_min as number | null) ?? null, pets: (p?.pets as boolean | null) ?? null,
        neighborhoods: (p?.neighborhoods as string[] | null) ?? [], moveIn: (p?.move_in as string | null) ?? null,
        bio: clip(p?.bio), about: clip(p?.about), lookingFor: clip(p?.looking_for), dealbreakers: clip(p?.dealbreakers_text),
        habits: (p?.habits as Record<string, unknown> | null) ?? {}, dealbreakerTags: (p?.dealbreaker_tags as string[] | null) ?? [], flock,
      };
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
    async distances(flockId, ids) {
      if (!ids.length) return new Map();
      const r = await db.rpc('flock_pin_distances', { p_flock_id: flockId, p_listing_ids: ids });
      // shortcut: a database without the pins migration (0018) has no such function. Distances are optional, so carry on without them and
      // "too far" falls back to the same-community rule, instead of failing the whole feedback request.
      if (r.error) return new Map();
      return new Map((r.data as { listing_id: string; max_mi: number }[]).map((x) => [x.listing_id, x.max_mi]));
    },
    async feedbackFor(flockId) {
      const rows = ok(await db.from('flock_feedback').select('listing_id, reason, user_id, created_at').eq('flock_id', flockId).not('listing_id', 'is', null).not('reason', 'is', null), 'feedback') as { listing_id: string; reason: string; user_id: string; created_at: string }[];
      return rows.map((r) => ({ listingId: r.listing_id, reason: r.reason, userId: r.user_id, createdAt: r.created_at }));
    },
    async retireShortlist(flockId, keepIds) {
      ok(await db.from('shortlist').update({ status: 'removed' }).eq('flock_id', flockId).eq('added_by', 'agent').not('listing_id', 'in', `(${keepIds.join(',')})`), 'shortlist');
    },
  };
}

// In memory, for tests and the offline smoke run.
export function memoryStore(seed: { plans: Plan[]; needs: Needs; context?: Partial<UserContext>; miles?: Record<string, number> }): AgentStore & { saved: Map<string, SavedPick>; invited: string[]; feedback: string[]; feedbackLog: { listingId: string; reason: string; userId: string; createdAt: string }[]; flocksSeen: string[] } {
  const saved = new Map<string, SavedPick>(), invited: string[] = [], feedback: string[] = [], flocksSeen: string[] = [];
  const feedbackLog: { listingId: string; reason: string; userId: string; createdAt: string }[] = [];
  return {
    saved, invited, feedback, feedbackLog, flocksSeen,
    async flockNeeds(flockId) { flocksSeen.push(flockId); return seed.needs; },
    async searchPlans({ maxRent, beds, limit }) { return seed.plans.filter((p) => p.rentMin <= maxRent && p.beds >= beds).slice(0, limit); },
    async findCandidates({ maxRent, beds, pets, viewport, limit }) {
      const all = seed.plans.filter((p) =>
        (maxRent == null || p.rentMin <= maxRent) && (beds == null || p.beds >= beds) && (!pets || p.pets !== false) &&
        (!viewport || (p.lat != null && p.lng != null && p.lat >= viewport.south && p.lat <= viewport.north && p.lng >= viewport.west && p.lng <= viewport.east)));
      return { plans: all.slice(0, limit), total: all.length };
    },
    async soloNeeds(userId) { return { ...seed.needs, size: 1, members: [{ userId, status: 'active' as const, budgetMax: seed.needs.members[0]?.budgetMax ?? null }] }; },
    async userContext(userId, flockId) {
      void userId;
      return { budgetMax: seed.needs.members[0]?.budgetMax ?? null, bedsMin: null, pets: null, neighborhoods: [], moveIn: null, bio: null, about: null, lookingFor: null, dealbreakers: null, habits: {}, dealbreakerTags: [], flock: flockId ? { size: seed.needs.size, combinedBudget: combinedBudget(seed.needs.members), bedroomsNeeded: seed.needs.bedroomsNeeded, about: null, lookingFor: null } : null, ...(seed.context ?? {}) };
    },
    async getPlans(ids) { return seed.plans.filter((p) => ids.includes(p.id)); },
    async saveShortlist(_f, picks) { picks.forEach((p) => saved.set(p.listingId, p)); return picks.length; },
    async shortlist() { return [...saved.values()].map((p) => ({ listingId: p.listingId, explanation: p.explanation, criteria: p.criteria, status: 'active' })); },
    async invite(_f, username) { invited.push(username); return 'invited'; },
    async recordFeedback(_f, userId, listingId, reason) { feedback.push(`${listingId}:${reason}`); feedbackLog.push({ listingId, reason, userId, createdAt: new Date().toISOString() }); },
    async distances(_f, ids) { return new Map(ids.filter((id) => seed.miles?.[id] != null).map((id) => [id, seed.miles![id]!])); },
    async feedbackFor() { return feedbackLog; },
    async retireShortlist(_f, keepIds) { for (const id of [...saved.keys()]) if (!keepIds.includes(id)) saved.delete(id); },
  };
}
