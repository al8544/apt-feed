// lib/api.ts — every screen gets its data from here.
// UI code should import from this file only, never call supabase directly.
import { supabase } from './supabase';
import { voteState } from './compare';

// Who you are and which flock you're looking at. With sign-in, SessionGate (components/SessionGate.tsx) sets both
// from the Supabase session and the flock picked on "Your flocks", before any screen renders.
// Demo mode (NEXT_PUBLIC_DEMO=1) keeps the old switcher: seeded people, no sign-in. Ids come from seed.sql.
export const DEMO = process.env.NEXT_PUBLIC_DEMO === '1';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_FLOCK_ID = '00000000-0000-0000-0000-0000000000a1';
const USER_KEY = 'aptHunt.userId';
const FLOCK_KEY = 'flock.current';

function stored(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export let CURRENT_USER_ID = DEMO ? stored(USER_KEY) || DEMO_USER_ID : '';
export let GROUP_ID = DEMO ? DEMO_FLOCK_ID : stored(FLOCK_KEY) || '';

// Called once by SessionGate after it reads the session.
export function setSessionUser(userId: string): void {
  CURRENT_USER_ID = userId;
}

export const storedFlockId = () => (DEMO ? DEMO_FLOCK_ID : stored(FLOCK_KEY));

// The current flock's name, loaded by SessionGate with loadCurrentFlock().
export let FLOCK_NAME = '';

// Checks the saved flock still exists and you're still in it; false = pick again on Your flocks.
export async function loadCurrentFlock(): Promise<boolean> {
  if (!GROUP_ID) return false;
  const { data } = await supabase
    .from('flock_members').select('flock:flocks(name)')
    .eq('flock_id', GROUP_ID).eq('user_id', CURRENT_USER_ID).eq('status', 'active').maybeSingle();
  const name = (data as { flock: { name: string } | null } | null)?.flock?.name;
  FLOCK_NAME = name ?? '';
  return !!name;
}

// Pick the flock every screen reads (00d "Your flocks"). Remembered on this device.
export function selectFlock(flockId: string): void {
  try { window.localStorage.setItem(FLOCK_KEY, flockId); } catch { /* storage blocked: this visit only */ }
  GROUP_ID = flockId;
}

// Switch who you are (demo only), then reload so every screen refetches as that person.
export function switchUser(userId: string): void {
  try { window.localStorage.setItem(USER_KEY, userId); } catch { /* storage blocked: switch for this page only */ }
  CURRENT_USER_ID = userId;
  window.location.reload();
}

// After leaving a flock: nothing selected, so the gate sends you to Your flocks.
export function forgetFlock(): void {
  try { window.localStorage.removeItem(FLOCK_KEY); } catch { /* nothing stored */ }
  GROUP_ID = '';
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  try { window.localStorage.removeItem(FLOCK_KEY); } catch { /* nothing stored */ }
  CURRENT_USER_ID = '';
  GROUP_ID = '';
}

// Your flocks (00d): active memberships with a few faces and a one-line summary.
export type FlockSummary = {
  id: string; name: string; kind: 'friends' | 'open'; maxSize: number | null;
  members: Profile[]; areas: string[]; budgetMin: number | null; budgetMax: number | null;
};

export async function getMyFlocks(): Promise<FlockSummary[]> {
  const mine = check(
    await supabase.from('flock_members').select('flock_id').eq('user_id', CURRENT_USER_ID).eq('status', 'active')
  ) as { flock_id: string }[];
  if (!mine.length) return [];
  const rows = check(
    await supabase.from('flocks')
      .select('id, name, kind, max_size, filters, flock_members(status, user:profiles(*))')
      .in('id', mine.map((m) => m.flock_id))
  ) as unknown as {
    id: string; name: string; kind: 'friends' | 'open'; max_size: number | null;
    filters: { areas?: string[]; budget_min?: number; budget_max?: number } | null;
    flock_members: { status: string; user: Profile }[];
  }[];
  return rows.map((f) => ({
    id: f.id, name: f.name, kind: f.kind, maxSize: f.max_size,
    members: f.flock_members.filter((m) => m.status === 'active').map((m) => m.user),
    areas: f.filters?.areas ?? [], budgetMin: f.filters?.budget_min ?? null, budgetMax: f.filters?.budget_max ?? null,
  }));
}

// Route Handlers check the caller's token (lib/server/auth.ts), so send it.
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...init, headers });
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

// 00f / 00h: create a flock; the caller becomes its admin. Body is validated by lib/flocks.ts on the server.
export async function createFlock(body: Record<string, unknown>): Promise<string> {
  return (await json<{ id: string }>(await authFetch('/api/flocks', { method: 'POST', body: JSON.stringify(body) }))).id;
}

// 00j: ask to join an open flock. 'requested' | 'mismatch' | 'full' | 'closed' | 'already_member' ('joined' = accepted an invite).
export async function joinFlock(flockId: string): Promise<string> {
  const res = await authFetch(`/api/flocks/${flockId}/join`, { method: 'POST' });
  const body = await res.json().catch(() => ({}));
  if (body.status) return body.status as string; // 409 full/closed still carries a status
  throw new Error(body.error ?? `Request failed (${res.status})`);
}

// 00i / 00j: open flocks ranked by compatibility, computed on the server (others' details never reach the browser).
export type DiscoveredFlock = {
  id: string; name: string; about: string | null; lookingFor: string | null;
  members: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_color'>[];
  maxSize: number | null; area: string | null; budgetMin: number | null; budgetMax: number | null;
  matchPct: number; passes: boolean; checks: { key: string; ok: boolean | null; reason: string }[];
  createdAt: string;
};

export async function discoverFlocks(): Promise<DiscoveredFlock[]> {
  return (await json<{ flocks: DiscoveredFlock[] }>(await authFetch('/api/flocks/discover'))).flocks;
}

// The agent reads what you wrote and each open flock's text, for the flocks you already pass the rules for. Best fit first.
// Throws the server's message (no model key, daily limit, model down) so the page can fall back to the rule-based list.
export type FlockMatch = { flockId: string; fit: 'strong' | 'possible' | 'weak'; reason: string };

export async function getFlockMatches(): Promise<FlockMatch[]> {
  return (await json<{ matches: FlockMatch[] }>(await authFetch('/api/flocks/match', { method: 'POST' }))).matches;
}

export async function getFlockProfile(flockId: string): Promise<DiscoveredFlock | null> {
  return (await json<{ flocks: DiscoveredFlock[] }>(await authFetch(`/api/flocks/discover?id=${encodeURIComponent(flockId)}`))).flocks[0] ?? null;
}

// 05: the admin's open/closed switch. Open = listed in Find a flock, and people send a request.
export async function getFlockOpen(): Promise<boolean> {
  return (check(await supabase.from('flocks').select('open_to_join').eq('id', GROUP_ID).single()) as { open_to_join: boolean }).open_to_join;
}
export async function setFlockOpen(open: boolean): Promise<void> {
  check(await supabase.rpc('set_flock_open', { p_flock_id: GROUP_ID, p_open: open }));
}

export async function leaveFlock(flockId: string): Promise<void> {
  check(await supabase.rpc('leave_flock', { p_flock_id: flockId }));
}

// People who left the current flock (for "Continue as a smaller flock?").
export async function getLeftMembers(): Promise<Profile[]> {
  const rows = check(
    await supabase.from('flock_members').select('user:profiles(*)').eq('flock_id', GROUP_ID).eq('status', 'left')
  ) as unknown as { user: Profile }[];
  return rows.map((r) => r.user);
}

// Invite link (/join/<flock id>): adds the signed-in user to that flock. Returns 'joined' | 'already_member' | 'full'.
export async function joinByInvite(flockId: string): Promise<string> {
  return check(await supabase.rpc('join_by_invite', { p_flock_id: flockId })) as string;
}

// T11: groups the agent proposed that are waiting for my answer (RLS shows only proposals I am in).
// `accepted`: I said yes and am waiting for the others (the card stays so I can see that).
export type Proposal = { id: string; name: string; expiresAt: string; accepted: boolean; members: Profile[] };

export async function getMyProposals(): Promise<Proposal[]> {
  const rows = check(
    await supabase.from('proposal_members')
      .select('response, proposal:proposals!inner(id, suggested_name, expires_at, proposal_members(user:profiles(*)))')
      .eq('user_id', CURRENT_USER_ID).in('response', ['pending', 'accepted']).eq('proposal.status', 'pending')
  ) as unknown as { response: string; proposal: { id: string; suggested_name: string | null; expires_at: string; proposal_members: { user: Profile }[] } }[];
  return rows
    .filter((r) => new Date(r.proposal.expires_at) > new Date())
    .map(({ response, proposal: p }) => ({
      id: p.id, name: p.suggested_name ?? 'New flock', expiresAt: p.expires_at, accepted: response === 'accepted', members: p.proposal_members.map((m) => m.user),
    }));
}

// Accept or decline. 'waiting' | 'flock_created' | 'declined' | 'expired' | 'closed' | 'already_responded'.
export async function respondToProposal(proposalId: string, accept: boolean): Promise<string> {
  const res = await authFetch(`/api/proposals/${proposalId}/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
  const body = await res.json().catch(() => ({}));
  if (body.status) return body.status as string; // 409 expired/closed still carries a status
  throw new Error(body.error ?? `Request failed (${res.status})`);
}

// ---------- Types ----------
export type Listing = {
  id: string; address: string;
  neighborhood: string | null;   // null = unknown (CoStar has none; derived later)
  price: number; beds: number; baths: number;
  sqft: number | null;
  pets: boolean | null;          // null = unknown, not "no"
  lat: number; lng: number; photos: string[];
  community_id?: string | null;   // set on rows from listing_cards
  community_name?: string | null; // set on rows from listing_cards
  photo_credit_url?: string | null; // Apartments.com page the enriched photos came from, if any
};

export type Profile = {
  id: string; username: string; display_name: string; avatar_color: string; bio: string | null;
  budget_max: number | null; beds_min: number | null; pets: boolean | null;
  neighborhoods: string[] | null; move_in: string | null;
  // The three long answers on Find a flock (the agent reads them). Optional: only that screen asks for them.
  about?: string | null; looking_for?: string | null; dealbreakers_text?: string | null;
};

export type Match = { met: number; total: number; pct: number };

export type GroupListing = Listing & {
  likes: number;          // thumbs-up from active flock members
  likedBy: Profile[];     // who they are
  down: number;           // thumbs-down from active flock members
  contested: boolean;     // at least one thumbs-down, but fewer than half the flock
  removed: boolean;       // thumbs-down reached half the flock, rounded up: off the active list, not suggested again
  match: Match;           // "Matches 3 of 4 group prefs" / "92% group match"
};

export type FeedPost = { id: string; user: Profile; listing: GroupListing; swipedAt: string };
export type Story = { user: Profile; hasNew: boolean };
export type Member = Profile & { role: string; swipeCount: number };
export type Tour = { id: string; startsAt: string; listing: Listing; attendees: Profile[] };
export type Message = {
  id: string; sender_id: string; recipient_id: string;
  listing_id: string | null; body: string; created_at: string;
};
export type MapFilters = { likedByGroup?: boolean; maxPrice?: number; minBeds?: number; pets?: boolean };

const LISTING_COLS = 'id,address,neighborhood,price,beds,baths,sqft,pets,lat,lng,photos';
// The map and deck read one card per community (view listing_cards, migration 0005).
const CARD_COLS = `${LISTING_COLS},community_id,community_name,photo_credit_url`;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// Every active floor plan of a community, smallest first (the last slide of the detail gallery). Brooklyn rows have no community: [].
export type FloorPlan = Pick<Listing, 'id' | 'beds' | 'baths' | 'sqft' | 'price'>;
export async function getFloorPlans(communityId: string): Promise<FloorPlan[]> {
  return check(
    await supabase.from('listings').select('id,beds,baths,sqft,price')
      .eq('community_id', communityId).eq('active', true).order('beds').order('price')
  ) as FloorPlan[];
}

// ---------- Group helpers ----------
async function getMemberProfiles(): Promise<Profile[]> {
  const rows = check(
    await supabase.from('flock_members').select('role, user:profiles(*)').eq('flock_id', GROUP_ID).eq('status', 'active')
  ) as unknown as { role: string; user: Profile }[];
  return rows.map((r) => r.user);
}

// Group match: budget, beds, pets, neighborhood — checked against the whole group's preferences.
export function groupMatch(l: Listing, members: Profile[]): Match {
  const budgets = members.map((m) => m.budget_max).filter((b): b is number => b != null);
  const avgBudget = budgets.length ? budgets.reduce((a, b) => a + b, 0) / budgets.length : Infinity;
  const minBeds = Math.max(0, ...members.map((m) => m.beds_min ?? 0));
  const needsPets = members.some((m) => m.pets);
  const hoods = new Set(members.flatMap((m) => m.neighborhoods ?? []));

  // Unknown is not "no": a listing with no pet policy or neighborhood is not checked on that, rather than failed.
  const checks = [l.price <= avgBudget, l.beds >= minBeds];
  if (l.pets != null) checks.push(!needsPets || l.pets);
  if (l.neighborhood != null) checks.push(hoods.has(l.neighborhood));
  const met = checks.filter(Boolean).length;
  return { met, total: checks.length, pct: Math.round((met / checks.length) * 100) };
}

async function decorate(listings: Listing[], members?: Profile[]): Promise<GroupListing[]> {
  const people = members ?? (await getMemberProfiles());
  const byId = new Map(people.map((p) => [p.id, p]));
  const likeRows = check(
    await supabase.from('flock_votes').select('listing_id, likes, down, liked_by').eq('flock_id', GROUP_ID)
  ) as { listing_id: string; likes: number; down: number; liked_by: string[] }[];
  const likes = new Map(likeRows.map((r) => [r.listing_id, r]));

  return listings.map((l) => {
    const row = likes.get(l.id);
    return {
      ...l,
      likes: row?.likes ?? 0,
      down: row?.down ?? 0,
      ...voteState(row?.down ?? 0, people.length),
      likedBy: (row?.liked_by ?? []).map((id) => byId.get(id)).filter((p): p is Profile => !!p),
      match: groupMatch(l, people),
    };
  });
}

// ---------- Home ----------
export async function getStories(): Promise<Story[]> {
  const members = await getMemberProfiles();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const recent = check(
    await supabase.from('swipes').select('user_id').gte('created_at', since).eq('flock_id', GROUP_ID)
      .in('user_id', members.map((m) => m.id))
  ) as { user_id: string }[];
  const active = new Set(recent.map((r) => r.user_id));
  // current user first ("your swipes"), then everyone else
  return [...members]
    .sort((a, b) => (a.id === CURRENT_USER_ID ? -1 : b.id === CURRENT_USER_ID ? 1 : 0))
    .map((user) => ({ user, hasNew: active.has(user.id) }));
}

export async function getGroupFeed(limit = 30): Promise<FeedPost[]> {
  const members = await getMemberProfiles();
  const rows = check(
    await supabase.from('swipes')
      .select(`created_at, user:profiles(*), listing:listings(${LISTING_COLS})`)
      .eq('direction', 'right').eq('flock_id', GROUP_ID)
      .in('user_id', members.map((m) => m.id))
      .order('created_at', { ascending: false })
      .limit(limit)
  ) as unknown as { created_at: string; user: Profile; listing: Listing }[];

  const decorated = await decorate(rows.map((r) => r.listing), members);
  return rows.map((r, i) => ({
    id: `${r.user.id}-${r.listing.id}`, user: r.user, listing: decorated[i], swipedAt: r.created_at,
  }));
}

// ---------- Reels (swipe deck) ----------
// review = 'right' | 'left': instead of the unseen listings, the ones you already liked / passed on.
export async function getSwipeDeck(limit = 20, review?: 'right' | 'left'): Promise<GroupListing[]> {
  const swiped = check(
    await supabase.from('swipes').select('listing_id, direction').eq('user_id', CURRENT_USER_ID).eq('flock_id', GROUP_ID)
  ) as { listing_id: string; direction: 'left' | 'right' }[];
  const dirs = new Map(swiped.map((s) => [s.listing_id, s.direction]));
  const listings = (check(await supabase.from('listing_cards').select(CARD_COLS)) as Listing[]).filter((l) =>
    review ? dirs.get(l.id) === review : !dirs.has(l.id)
  );
  // A place the flock removed is not suggested again (it still shows up when you review your own piles).
  const decorated = (await decorate(listings)).filter((l) => review || !l.removed);
  return decorated.sort((a, b) => b.match.pct - a.match.pct || b.likes - a.likes).slice(0, limit);
}

export async function swipe(listingId: string, direction: 'right' | 'left'): Promise<void> {
  check(await supabase.from('swipes').upsert(
    { user_id: CURRENT_USER_ID, listing_id: listingId, flock_id: GROUP_ID, direction, created_at: new Date().toISOString() },
    { onConflict: 'user_id,listing_id,flock_id' }
  ));
}

export async function undoSwipe(listingId: string): Promise<void> {
  check(await supabase.from('swipes').delete().eq('user_id', CURRENT_USER_ID).eq('listing_id', listingId).eq('flock_id', GROUP_ID));
}

// Every listing the current user has swiped on ("seen"), with which way.
export async function getMySwipes(): Promise<Map<string, 'left' | 'right'>> {
  const rows = check(
    await supabase.from('swipes').select('listing_id, direction').eq('user_id', CURRENT_USER_ID).eq('flock_id', GROUP_ID)
  ) as { listing_id: string; direction: 'left' | 'right' }[];
  return new Map(rows.map((r) => [r.listing_id, r.direction]));
}

// ---------- Stash (bookmarks) ----------
export async function stash(listingId: string): Promise<void> {
  check(await supabase.from('stash').upsert({ user_id: CURRENT_USER_ID, listing_id: listingId }));
}

export async function unstash(listingId: string): Promise<void> {
  check(await supabase.from('stash').delete().eq('user_id', CURRENT_USER_ID).eq('listing_id', listingId));
}

export async function getStash(): Promise<Listing[]> {
  const rows = check(
    await supabase.from('stash').select(`created_at, listing:listings(${LISTING_COLS})`)
      .eq('user_id', CURRENT_USER_ID).order('created_at', { ascending: false })
  ) as unknown as { listing: Listing }[];
  return rows.map((r) => r.listing);
}

// ---------- Map ----------
export async function getMapListings(filters: MapFilters = {}): Promise<GroupListing[]> {
  let q = supabase.from('listing_cards').select(CARD_COLS);
  if (filters.maxPrice) q = q.lte('price', filters.maxPrice);
  if (filters.minBeds) q = q.gte('beds', filters.minBeds);
  if (filters.pets) q = q.eq('pets', true);
  const decorated = await decorate(check(await q) as Listing[]);
  return filters.likedByGroup ? decorated.filter((l) => l.likes >= 2) : decorated;
}

// ---------- Tours ----------
export async function getTours(year: number, month: number /* 1-12 */): Promise<Tour[]> {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();
  const rows = check(
    await supabase.from('tours')
      .select(`id, starts_at, listing:listings(${LISTING_COLS}), tour_attendees(user:profiles(*))`)
      .eq('flock_id', GROUP_ID).gte('starts_at', start).lt('starts_at', end)
      .order('starts_at')
  ) as unknown as { id: string; starts_at: string; listing: Listing; tour_attendees: { user: Profile }[] }[];
  return rows.map((r) => ({
    id: r.id, startsAt: r.starts_at, listing: r.listing, attendees: r.tour_attendees.map((a) => a.user),
  }));
}

export async function getTour(id: string): Promise<Tour | null> {
  const r = check(
    await supabase.from('tours')
      .select(`id, starts_at, listing:listings(${LISTING_COLS}), tour_attendees(user:profiles(*))`)
      .eq('id', id).maybeSingle()
  ) as unknown as { id: string; starts_at: string; listing: Listing; tour_attendees: { user: Profile }[] } | null;
  return r && { id: r.id, startsAt: r.starts_at, listing: r.listing, attendees: r.tour_attendees.map((a) => a.user) };
}

// Listings the flock has a tour booked for (any date).
export async function getTouredListingIds(): Promise<Set<string>> {
  const rows = check(
    await supabase.from('tours').select('listing_id').eq('flock_id', GROUP_ID)
  ) as { listing_id: string }[];
  return new Set(rows.map((r) => r.listing_id));
}

export async function createTour(listingId: string, startsAt: Date, attendeeIds: string[] = [CURRENT_USER_ID]): Promise<string> {
  const tour = check(
    await supabase.from('tours')
      .insert({ flock_id: GROUP_ID, listing_id: listingId, starts_at: startsAt.toISOString(), created_by: CURRENT_USER_ID })
      .select('id').single()
  ) as { id: string };
  check(await supabase.from('tour_attendees').insert(attendeeIds.map((user_id) => ({ tour_id: tour.id, user_id }))));
  return tour.id;
}

// An update or delete that matches no rows (e.g. blocked by row-level security) must not look like success.
const changed = (rows: unknown[] | null) => {
  if (!rows?.length) throw new Error('Could not change this tour');
};

export async function rescheduleTour(tourId: string, startsAt: Date): Promise<void> {
  changed(check(await supabase.from('tours').update({ starts_at: startsAt.toISOString() }).eq('id', tourId).select('id')) as unknown[]);
}

export async function cancelTour(tourId: string): Promise<void> {
  check(await supabase.from('tour_attendees').delete().eq('tour_id', tourId));
  changed(check(await supabase.from('tours').delete().eq('id', tourId).select('id')) as unknown[]);
}

export async function joinTour(tourId: string): Promise<void> {
  check(await supabase.from('tour_attendees').upsert({ tour_id: tourId, user_id: CURRENT_USER_ID }));
}

export async function leaveTour(tourId: string): Promise<void> {
  check(await supabase.from('tour_attendees').delete().eq('tour_id', tourId).eq('user_id', CURRENT_USER_ID));
}

// ---------- Account ----------
export async function getProfile(userId = CURRENT_USER_ID): Promise<Profile> {
  return check(await supabase.from('profiles').select('*').eq('id', userId).single()) as Profile;
}

export async function updatePreferences(
  prefs: Partial<Pick<Profile, 'budget_max' | 'beds_min' | 'pets' | 'neighborhoods' | 'move_in' | 'bio' | 'about' | 'looking_for' | 'dealbreakers_text'>>
): Promise<void> {
  check(await supabase.from('profiles').update(prefs).eq('id', CURRENT_USER_ID));
}

export async function getGroupMembers(): Promise<Member[]> {
  const rows = check(
    await supabase.from('flock_members').select('role, user:profiles(*)').eq('flock_id', GROUP_ID).eq('status', 'active')
  ) as unknown as { role: string; user: Profile }[];
  const swipes = check(
    await supabase.from('swipes').select('user_id').eq('flock_id', GROUP_ID).in('user_id', rows.map((r) => r.user.id))
  ) as { user_id: string }[];
  const counts = new Map<string, number>();
  swipes.forEach((s) => counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1));
  return rows.map((r) => ({ ...r.user, role: r.role, swipeCount: counts.get(r.user.id) ?? 0 }));
}

export async function getAccountStats(): Promise<{ swipes: number; stashed: number; tours: number }> {
  const count = async (table: string, col: string) =>
    (await supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, CURRENT_USER_ID)).count ?? 0;
  const [swipes, stashed, tours] = await Promise.all([
    count('swipes', 'user_id'), count('stash', 'user_id'), count('tour_attendees', 'user_id'),
  ]);
  return { swipes, stashed, tours };
}

// ---------- Messages (needs: alter publication supabase_realtime add table messages;) ----------
export async function getMessages(otherUserId: string): Promise<Message[]> {
  const me = CURRENT_USER_ID;
  return check(
    await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${me})`)
      .order('created_at')
  ) as Message[];
}

export async function sendMessage(toUserId: string, body: string, listingId?: string): Promise<void> {
  check(await supabase.from('messages').insert({
    sender_id: CURRENT_USER_ID, recipient_id: toUserId, body, listing_id: listingId ?? null,
  }));
}

// Calls onMessage for every new message sent TO the current user. Returns an unsubscribe function.
export function subscribeToMessages(onMessage: (m: Message) => void): () => void {
  const channel = supabase
    .channel(`inbox:${CURRENT_USER_ID}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${CURRENT_USER_ID}` },
      (payload) => onMessage(payload.new as Message))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
// ---------- Live flock activity (swipes are in the realtime publication, migration 0001) ----------
// Calls onChange whenever anyone in the flock swipes or undoes a swipe. Returns an unsubscribe function.
export function subscribeToGroupSwipes(onChange: () => void): () => void {
  const channel = supabase
    .channel(`group-swipes:${GROUP_ID}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'swipes', filter: `flock_id=eq.${GROUP_ID}` }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
