# Flock — End-Goal Design & Implementation Guide

HackPrinceton 2026 · CoStar track ("Inside and Out: AI for the Built World")
Last updated 2026-11-14. Written from the code in `apt-feed/` and the Figma file (ApartmentHunt, fileKey `hhJ5S96nl01Od3RaXX5VRm`).

> **Goal:** make it as easy as possible to find an apartment that works for everyone in a flock, with every roommate's input — then let an agent do the legwork.
>
> **Core idea:** find your people, then find your place.
>
> **Tracks:** CoStar ("Inside and Out") and LangChain **Deep Agents** ("build a deep agent for any use case"). All agentic behavior (group matching, apartment search, aerial checks, shortlist updates, the search bar's "Ducktect best option") runs on one Deep Agent built with `deepagents` (§8). CoStar kit + apartments.com images + Vexcel aerial imagery are the data.

Tags used below: **[built]** exists in code today · **[figma]** designed, not in code · **[planned]** proposed here · **[verify]** a fact we have not confirmed (usually about the CoStar kit).

---

## 1. Principles

1. **Real data first.** The CoStar data kit is the source of truth for listings. Apartments.com images and Vexcel aerial evidence enrich it. If either is unavailable the app degrades (kit photo only; no aerial evidence, and the UI says so) instead of breaking.
2. **The group decides.** Every ranking is explained by explicit, per-person criteria. The agent proposes and saves; people vote.
3. **Scores come from code, not the model.** The Deep Agent plans, delegates to subagents, parses intent and writes explanations. Numbers (match %, rent share, flock score, aerial evidence) come from tools backed by pure, tested functions, and the UI renders them from the database by id.
4. **Consent before sharing.** Nobody is put in a flock, and no private profile detail is shown, without an explicit accept (or a rule they set up themselves, see §7.4).
5. **Say what we don't know.** Missing availability, missing photos and unverified amenities are shown as such, never filled in.

---

## 2. Product scope

### 2.1 What a user does

| Step | Screen (Figma) | Notes |
|---|---|---|
| Sign up / sign in | 00a Welcome, 00b Sign in, 00c Sign up **[figma]** | Replaces the demo user switcher |
| See flocks, create or find one | 00d Your Flocks, 00e Type, 00i Find a Flock, 00j Flock Profile **[figma]** | |
| Create a **Friends** flock | 00f New Friends Flock **[figma]** | Basic + filter-based: name, invites, budget, beds, areas |
| Create an **Open** flock | 00g About, 00h Join Rules **[figma]** | Wordy prompts (strangers read it) + "open to join if compatible" rules |
| Browse picks | 01 Flock Picks **[built]**, 02 For You (swipe) **[built]**, 02b End of deck **[figma]** | |
| Explore on map | 03 Map, 07 Map Listing **[built]** | |
| Book / see tours | 04 Calendar **[built]**, 01a/01b Book Tour sheet **[figma]** (a `BookTourSheet` component exists **[built]**) | |
| Rank and compare | 05 Flock, 08 Compare **[built]** | Score weights per the Figma dev note |
| Account and prefs | 06 Account **[built]** | |
| Search, including **"Ducktect best option"** | `MapSearch` search bar **[built]**; the Ducktect option **[planned]**, not yet in Figma | Type anything; pick "Ducktect best option" and the agent finds and explains the best match using CoStar listings + Vexcel aerial imagery (§8.9) |
| Ask the agent | none yet **[planned]** | "Ask Flock" sheet: roommate proposals, shortlist updates, feedback (§8) |

### 2.2 Friends flock vs Open flock

| | Friends flock | Open flock |
|---|---|---|
| How people join | Invite → accept | Anyone whose profile passes the owner's rules can join; others request |
| Setup prompts | Short, filter-based (budget, beds, areas, move-in) | Longer, free text: about the flock, about you, who you want, dealbreakers |
| Why | You already know each other | Strangers need to know who they are living with |
| Private details | Visible to members | Public profile = bio + prefs only; full profile only after joining |

A third origin is **agent-proposed**: the agent suggests a group of compatible people; everyone must accept before the flock exists.

**Flocks are any size from 2 up.** Three is fine; nothing in the product or the math assumes four.

### 2.3 Voting and cards

- **Voting is thumbs up / thumbs down**, the same two icons as the For You deck ("Yes" / "Nope"). Each vote belongs to one person in one flock; changing it updates the row. A thumbs-down can carry an optional reason chip ("too far", "too expensive", "no pets") that feeds the agent. Comments are separate (`listing_comments`).
- **The deck and the map show one card or pin per community**, using the floor plan that best fits the flock (the cheapest one that meets the bedroom need), with a floor-plan picker on the detail view. Votes and shortlist items attach to a specific **floor plan**, because that is what the flock would rent.

---

## 3. Current state (read from the code)

**Stack:** Next.js 16.4.6 (App Router, `cacheComponents: true`, `partialPrefetching: true`), React 19, Tailwind 4, Supabase (`@supabase/supabase-js`), Google Maps (`@vis.gl/react-google-maps`), framer-motion. Font Gaegu.

**Shape:** a client-rendered app. Every screen is a `'use client'` page that calls `lib/api.ts`, which calls Supabase directly from the browser with the anon key. `lib/api.ts` states the rule "UI code should import from this file only."

| Route | Screen |
|---|---|
| `/` | Redirects to `/group` (the app opens on the flock) |
| `/picks` | Flock Picks (group feed, live via Supabase realtime) |
| `/reels` | For You swipe deck (`ListingReel`): tap the photo to flip, "More info ›" for the listing; end-of-deck recap with review piles; Yes / Nope toasts with Undo |
| `/map`, `/map/[id]` | Map + listing view (same deck, started at the tapped place) |
| `/listing/[id]` | Listing detail: photo, price, who liked it, Book a tour, Stash |
| `/tours`, `/tours/[id]` | Calendar (selected day's tours above Upcoming) and tour detail (RSVP toggle, Reschedule, Cancel) |
| `/group`, `/members`, `/invite` | Flock: rankings, preferences, member list, invite link |
| `/compare`, `/compare/pick` | Compare with weighted score |
| `/account`, `/stash` | Account and My Stash |

**Tables the code uses** (now in `supabase/migrations/0001_schema.sql`, reconstructed from the code and live data, so **[verify]** it against `supabase db dump --schema public`; `listing_cards`, `communities`, `listing_media` and `listing_enrichment` were added after): `profiles`, `group_members(role)`, a group table keyed by `GROUP_ID`, `group_likes` (listing_id, likes, liked_by[]), `swipes(user_id, listing_id, direction)`, `stash`, `listings(id,address,neighborhood,price,beds,baths,sqft,pets,lat,lng,photos[])`, `tours`, `tour_attendees`, `messages`.

**Scoring today:** `groupMatch()` in `lib/api.ts` (4 checks: price vs average budget, beds, pets, neighborhood) and `flockScore()` in `lib/compare.ts` (`70 × share of flock that liked + 0.3 × match %`, from the Figma dev note). Pure functions, tested with `node --test` in `lib/compare.test.ts`.

### 3.1 Gaps between today and the goal

| Gap | Where | Why it matters |
|---|---|---|
| Hard-coded single group and user | `GROUP_ID`, `CURRENT_USER_ID` (localStorage), `UserSwitcher` | Needs real accounts and many flocks |
| No auth, and RLS was off | anon key in the browser | **Verified (T1):** with the anon key every table could be read and written. `supabase/migrations/0003_rls.sql` is the fix, but strict RLS hides everything from an app that does not sign anyone in, so demos apply `supabase/dev-open-access.sql` until sign-in (T9) lands. `node scripts/check-rls.mjs` tests it |
| ~~Schema and seed not in the repo~~ **fixed (T1)** | `supabase/migrations/0001`–`0007`, `docs/LOCAL_DATABASE.md` | A teammate can rebuild the DB locally with `supabase start`. Still to do: diff the reconstructed schema against a real dump |
| Data is a Brooklyn seed | **Code fixed (T4):** the app reads `listing_cards`, map centered on LA, `GROUP_NAME = 'Our Flock'`. **Your real Supabase project is still Brooklyn** until the cutover (`supabase/cutover-brooklyn-to-la.sql`, destructive, manual) | CoStar's kit covers Los Angeles and Houston; the demo city is LA |
| `budget_max` is ambiguous | `groupMatch` compares total `price` to the *average* of members' `budget_max` | Must define it as each person's maximum rent **share** (see §7.1) |
| `subscribeToGroupSwipes` listens to every swipe in the table | `lib/api.ts` | Filter by flock, or one channel per flock |
| `getSwipeDeck` builds a long `not.in (...)` URL | `lib/api.ts` | Breaks past a few hundred swipes; move to a SQL view/RPC |
| No server code | no `app/api/**`, no `proxy.ts` | Agent and ingestion need a server |
| Swipes are personal, not per flock | `swipes` has no `flock_id` | Thumbs votes need a flock context (§5.3) |
| Browser-only Supabase session | `lib/supabase.ts` client in the browser | Route Handlers can't see who is calling; see §10 |

---

## 4. Target architecture

```
                 Browser (Next.js client pages, same screens as today)
                                   │  lib/api.ts  (single import point for UI)
              ┌────────────────────┴───────────────────────┐
              │ reads/writes under RLS                      │ agent + privileged actions
              ▼                                             ▼
        Supabase (Postgres + Auth + Realtime)      Route Handlers  app/api/**   (server only)
              ▲                                             │
              │                                  lib/server/*  (services)
              │                    ┌───────────────┬────────┴───────┬──────────────┐
              │                    ▼               ▼                ▼              ▼
              │              lib/match/*     lib/agent/*     lib/enrich/*     lib/costar/*
              │             (pure scoring)  (Deep Agent)   (images, aerial)  (kit readers)
              │
   offline scripts (run by a teammate, write to Supabase with the service key)
      scripts/ingest-costar.ts → communities, listings
      scripts/enrich-apartments-com.ts → listing_media
      scripts/enrich-vexcel.ts (pre-warm common phrases) → aerial_queries, listing_enrichment
```

**Rules of the road**

- Browser code keeps using `lib/api.ts`. Anything that needs a secret (Anthropic, Vexcel, service-role key) goes through a Route Handler. Secrets are never `NEXT_PUBLIC_*`.
- Heavy or rate-limited work (kit ingestion, image enrichment) is an **offline script**, not a request-time call. The app only reads the results from Supabase.
- Pure logic (`lib/match`, `lib/compare.ts`) has no I/O and is unit-tested.
- The Deep Agent runs in a **Node** Route Handler on a long-lived server (`next start` or a container) rather than a short-lived serverless function; see §8.6.
- Route Handlers authenticate with the caller's Supabase access token and query with a user-scoped client so RLS applies (§10).
- Next.js 16 notes (from the bundled docs in `node_modules/next/dist/docs`): Middleware is now **`proxy.ts`** (project root, exports `proxy`); it is for optimistic redirects only, not real authorization, so RLS and server checks remain the security boundary. Route Handlers live in `route.ts` under `app/`; with `cacheComponents` on, `POST` handlers are never cached and `GET` handlers run at request time unless they use `use cache`. Read `01-app/03-api-reference/03-file-conventions/route.md` and `…/02-route-segment-config` before adding segment config; options may be restricted with Cache Components.

### 4.1 Target folder layout

```
app/
  (auth)/signin, signup/                 [figma 00b, 00c]
  flocks/page.tsx, new/, find/, [id]/    [figma 00d–00j]
  api/agent/route.ts, resume/route.ts    Deep Agent chat (streams steps) + approve/reject resume
  api/ducktect/route.ts                  read-only agent for the search bar
  api/flocks/[id]/join/route.ts          open-flock join check + accept
  api/shortlist/route.ts                 optional: agent-saved shortlist reads
  (existing routes unchanged)
lib/
  api.ts                                 client data layer (keep; make flock-aware)
  match/                                 compat.ts, listing-fit.ts, rent-split.ts  (+ tests)
  agent/                                 flock-agent.ts, ducktect-agent.ts, subagents.ts, tools/, prompts.ts, schemas.ts
  costar/                                kit.ts (unzip + stream), map.ts (kit → rows)
  enrich/                                apartments-com.ts, vexcel.ts
  server/                                supabase-admin.ts, auth.ts
scripts/                                 ingest-costar.ts, enrich-apartments-com.ts
supabase/migrations/                     schema + RLS, version-controlled
proxy.ts                                 optimistic auth redirect
docs/DESIGN.md                           this file
```

---

## 5. Data model

Evolve the existing tables rather than rewrite. Keep `listings` as the name the UI already uses, but back it with real CoStar structure.

### 5.1 Property data (from the CoStar kit)

Evolve the existing tables rather than rewrite. The app keeps reading a table called `listings`, but it now holds **one row per CoStar floor plan** (what a flock actually rents), with a normalized `communities` parent.

```sql
-- One row per apartment community (CoStar property).
create table communities (
  id uuid primary key default gen_random_uuid(),
  costar_property_id text unique not null,   -- [verify] exact id field in the kit
  name text, address text, city text, postal_code text,
  lat double precision, lng double precision,
  neighborhood text,                         -- derived from a canonical LA list (see §6.1)
  management_company text,
  primary_photo_url text,
  source_type int,                           -- Residential Listings enum, see §6.1
  raw jsonb,                                 -- original record, for debugging
  ingested_at timestamptz default now()
);

-- One row per floor plan. This REPLACES the seeded Brooklyn listings table, so swipes, stash, tours
-- and messages keep pointing at "listings" and the embeds in lib/api.ts keep working.
create table listings (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities,
  costar_floorplan_id text,                  -- [verify]
  -- denormalized from the community so lib/api.ts (LISTING_COLS) works unchanged:
  address text, neighborhood text, lat double precision, lng double precision,
  beds int not null, baths numeric not null, sqft int,
  rent_min int, rent_max int,                -- floor-plan rent range from the kit
  price int,                                 -- = rent_min ("from" price); see §7.1 for the range rule
  pets boolean,                              -- null = unknown
  photos text[] default '{}',                -- kept in sync from listing_media (apartments.com first, kit photo as fallback)
  active boolean default true,               -- ingest sets false for rows missing from the kit; rows are never deleted
  raw jsonb,
  unique (community_id, costar_floorplan_id)
);
```

- The ingest and enrichment scripts keep the denormalized columns and `photos` in sync; the app never writes them.
- Rows are **never deleted** (swipes, shortlists and tours point at them); `active = false` hides them.
- A `community_cards(flock_id)` SQL function returns the best-fitting listing per community for a flock, which the deck and map use so one building is one card (§2.3).
- **Cutover:** listing ids change, so the Brooklyn seed rows in `swipes`, `stash`, `tours`, `tour_attendees` and `messages` are deleted when the LA listings are ingested.
- `pets` is nullable, so `groupMatch` must treat "unknown" as unknown, not "no" (today it is typed `boolean`).

### 5.2 Media and enrichment

```sql
create table listing_media (            -- images from the kit and from apartments.com (see §6.2)
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities on delete cascade,
  url text not null,
  kind text check (kind in ('photo','floorplan')) default 'photo',
  position int default 0,
  source text check (source in ('costar_kit','apartments_com')) not null,
  source_page_url text,                -- where it came from, for attribution
  match_confidence real,               -- how sure we are this is the right community
  fetched_at timestamptz default now()
);

create table listing_enrichment (       -- Vexcel property attributes per community (see §6.3)
  community_id uuid primary key references communities on delete cascade,
  vexcel_attributes jsonb, last_checked timestamptz
);

create table aerial_queries (           -- cache of Vexcel semantic searches, one per community + phrase
  community_id uuid references communities on delete cascade,
  phrase text not null,                 -- normalized visual phrase, e.g. 'swimming pool'
  buffer_m int not null,                -- search radius used
  result jsonb not null,                -- raw Vexcel response  [verify shape]
  score real,                           -- derived "how strongly imagery matches"  [verify what Vexcel returns]
  fetched_at timestamptz default now(),
  primary key (community_id, phrase, buffer_m)
);
```

### 5.3 People, flocks, decisions

**Status (T6, built and tested on a local database only):** `supabase/migrations/0008_flocks.sql`. Differences from the sketch below: `groups` and `group_members` were renamed (not new tables) to `flocks` and `flock_members`; `flock_members.status` defaults existing rows to `active`; `swipes.flock_id` is backfilled from membership and the migration refuses to run if someone swiped without being in any flock; `flock_votes` also exposes `likes` and `liked_by` so `lib/api.ts` reads it as it read `group_likes`; `flocks.discoverable` was added; `listing_comments` and `shortlist` are not built yet. `join_flock` returns a status text (`joined`, `requested`, `full`, `closed`, `already_member`) and its rule check (`flock_rules_ok`) is deliberately basic until `compat()` (T7) replaces it. `scripts/test-flocks.mjs` races two joins for the last seat 25 times and checks that non-members read nothing.

```sql
alter table profiles
  add column if not exists budget_max int,            -- max monthly rent SHARE this person accepts
  add column if not exists about text,                -- "About you" (open flocks): free text, for humans
  add column if not exists habits jsonb default '{}', -- structured: sleep, cleanliness 1-5, guests, smoking, noise
  add column if not exists dealbreakers_text text,    -- free text the user wrote
  add column if not exists dealbreaker_tags text[] default '{}',  -- structured tags code compares (see §7.4)
  add column if not exists discoverable boolean default false,    -- may appear in matching / Find a Flock
  add column if not exists is_demo boolean default false;         -- seeded fictional profile (no auth user)

create table flocks (                                  -- today's single "group", generalized
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text check (kind in ('friends','open')) not null,
  origin text check (origin in ('invited','open','agent_proposed')) default 'invited',
  about text, looking_for text,                        -- open-flock prose
  open_to_join boolean default false,
  join_rules jsonb default '{}',                       -- {budget:true, beds_movein:true, areas:true}
  max_size int,                                        -- null = no cap; flocks may be any size from 2 up
  bedrooms_needed int,                                 -- null = one bedroom per active member
  filters jsonb default '{}',                          -- budget range, beds, areas, move_in
  created_by uuid references profiles, created_at timestamptz default now()
);

create table flock_members (
  flock_id uuid references flocks on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text default 'member',
  status text check (status in ('invited','requested','active','declined','left')) not null,
  joined_via text check (joined_via in ('invite','auto_join','request','agent')) ,
  primary key (flock_id, user_id)
);

-- The agent's (and members') picks for a flock. No stored score: it is computed on read (§7.3).
create table shortlist (
  flock_id uuid references flocks on delete cascade,
  listing_id uuid references listings,
  explanation text, criteria jsonb,        -- per-criterion results (from lib/match) the explanation is built from
  status text check (status in ('active','contested','removed')) default 'active',
  added_by text check (added_by in ('agent','member')) default 'agent',
  agent_run_id uuid, created_at timestamptz default now(),
  primary key (flock_id, listing_id)
);

-- Votes are thumbs up / thumbs down, recorded in `swipes` (direction 'right' = thumbs up, 'left' = thumbs down),
-- now scoped to a flock. The For You deck and shortlist items both write here.
alter table swipes add column flock_id uuid references flocks on delete cascade;
-- primary key becomes (user_id, listing_id, flock_id); the deck's "seen" state is per flock.
alter table swipes add column reason text;   -- optional chip on a thumbs-down: 'too far' | 'too expensive' | 'no pets' | ...

create view flock_votes as                 -- replaces group_likes
select s.flock_id, s.listing_id,
       count(*) filter (where s.direction = 'right') as up,
       count(*) filter (where s.direction = 'left')  as down
from swipes s join flock_members m on m.flock_id = s.flock_id and m.user_id = s.user_id and m.status = 'active'
group by s.flock_id, s.listing_id;

-- Agent-proposed groups (and any "start a flock with these people" proposal).
create table proposals (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles, suggested_name text,
  status text check (status in ('pending','accepted','declined','expired')) default 'pending',
  expires_at timestamptz default now() + interval '48 hours',
  flock_id uuid references flocks                          -- set when it becomes a flock
);
create table proposal_members (
  proposal_id uuid references proposals on delete cascade, user_id uuid references profiles,
  response text check (response in ('pending','accepted','declined')) default 'pending',
  primary key (proposal_id, user_id)
);
-- A proposal becomes a flock when every invitee has accepted. If someone declines, the people who
-- accepted are asked "continue as a smaller flock?" (minimum 2).

create table listing_comments (flock_id uuid, user_id uuid, listing_id uuid, body text, created_at timestamptz default now());

create table flock_feedback (            -- rejections and reasons the agent learns from (§8.7)
  flock_id uuid references flocks on delete cascade, user_id uuid references profiles,
  listing_id uuid references listings, reason text, created_at timestamptz default now()
);

create table agent_runs (                  -- audit trail: what the agent did and why
  id uuid primary key default gen_random_uuid(),
  flock_id uuid references flocks, user_id uuid references profiles,
  request text, steps jsonb, result_summary text, created_at timestamptz default now()
);
```

Existing mapping: `group_members` → `flock_members`; the hard-coded `GROUP_ID` → a `flockId` from the route or session; `group_likes` → the `flock_votes` view above; `swipes` gains `flock_id` (and the deck's seen-state becomes per flock: a listing you thumbed in one flock shows again in another); `stash` stays personal; `tours` and `tour_attendees` are already group-scoped.

### 5.4 Row-level security (sketch)

Every table is RLS-on. Core pattern: a user can see a flock's rows only if they are an **active** member.

```sql
create policy "members read their flocks" on flocks for select
  using (exists (select 1 from flock_members m
                 where m.flock_id = flocks.id and m.user_id = auth.uid() and m.status = 'active'));
-- Open flocks expose a public profile through a view (name, about, looking_for, rules, open spots),
-- never the member list or private profile fields.
```

- **Profiles:** other people's `budget_max`, habits and dealbreakers are never selectable. A `public_profiles` view exposes name, avatar and (for open flocks) `about`, and only for `discoverable` users.
- **Service role:** the service-role key bypasses RLS. It is used only by ingestion scripts and a few security-definer functions (`join_flock`, proposal responses). Agent tools use a user-scoped client (§10).

---

## 6. Data sources

### 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**

**Status.** `scripts/ingest-costar.ts` loads 767 LA communities and 6,543 floor plans (1,747 records read; 980 Houston skipped; 2,181 plans without a rent, 287 priced per bed or bedroom, 3 without baths skipped). It is idempotent (a hash of every loaded row is identical after a re-run), dry-run by default, and guarded against writing to the project in `.env.local`. The mapping is `lib/costar/map.ts` (7 tests). Real field names are in the table below. The real project has none of it yet.

**What we know** (from the track guide and the kit docs we were given):

- Kit is a zip (about 160 MB) behind a download link and a zip password. Both come from the CoStar keys card; run `/costar-keys` in the track Discord. **Never commit the zip, the password, or extracted data**; add `data/` and `.cache/` to `.gitignore`.
- Contents include `data/apartment-listing.jsonl` (1,747 apartment listing records across Los Angeles and Houston), `models/apartment-listing.md`, `schemas/apartment-listing.schema.json`, `schemas/openapi.yaml`. The track's Matterport quickstart also refers to a `residential-listings.csv` (Homes listings, which carry the `source.sourceType` field below) and "commercial records" in the same kit. **[verify]** the real file list after unzipping, and which file(s) hold rentals; the apartment file and the residential file may overlap or differ.
- The kit is a password-protected zip (about 160 MB). The quickstart reads single files out of it with HTTP range requests, so the zip's table of contents is enough to list files without a full download.
- Records are organized around **communities and floor plans**, not individual units. Useful fields: property/community ids, min and max rent, floor-plan rents, beds, baths, coordinates, primary photo, management company.
- **Not on the apartment record.** `apartment-listing.jsonl` has no `sourceType`: every one of its 1,747 records is an active Apartments.com listing of a multifamily community, so there is nothing to filter on. LA is chosen by `address.state = 'CA'` and `address.city = 'Los Angeles'`.
- **Residential Listings (`residential-listings.csv`, not used)** carry `source.sourceType`, an integer enum: `0 None, 1 Mls, 2 Multifamily, 3 Land, 4 NewHomes`. For an apartment product, `2 = Multifamily` is the one we want. **[verify]** that this is the field we filter on, and whether any `Mls` or `NewHomes` rows are rentals.
- Not in the kit: interior galleries, personal agent contact info. Availability and public photo-display rights still need confirmation.

**Mapping (filled in from `models/apartment-listing.md`):**

| Our column | Source field | Notes |
|---|---|---|
| `communities.costar_property_id` | `propertyId` | Unique in the file; join key |
| `communities.name / address / city / postal_code` | `buildingName`; `address.streetNumber`+`streetDirection`+`streetName`+`streetType`+`streetSuffix`; `address.city`; `address.postCode` (first 5 digits) | |
| `communities.lat / lng` | `address.latitude` / `address.longitude` | All 767 LA records have them |
| `communities.primary_photo_url` | `primaryPhoto.attachmentUri`, size segment `/112/` changed to `/113/` | Hotlinked from CoStar's CDN; it loaded in the browser |
| `communities.management_company` | `propertyManagementCompanyName` | |
| `communities.neighborhood` | derived | Kit may not have it. Derive from ZIP or a point-in-polygon on LA neighborhood boundaries; Google reverse geocoding is a fallback (we already have a Maps key). Use one **canonical LA neighborhood list** for this and for the profile/flock area pickers, because matching is by exact name |
| `listings.beds / baths / sqft` | floor plan `numBeds` / `numBaths` / `minSquareFeet` | `sqft` is null when 0 or missing; 0 beds is a studio |
| `listings.rent_min / rent_max` | floor plan `minRent` / `maxRent` | `price = rent_min`. Plans with no rent (0 or null) or not priced per unit (`rentPricingType` 2 or 3) are skipped. 13 plans look like kit typos (min < $500 or max > 3x min) and are kept as given |
| pet policy, amenities | not on this record | `listings.pets` is null (unknown); the app skips unknown checks instead of failing them |

**Ingest script (`scripts/ingest-costar.ts`)**

1. Read `COSTAR_KIT_ZIP` (local path) or download `COSTAR_KIT_URL`; unzip with `COSTAR_ZIP_PASSWORD` into `data/` (not committed).
2. Stream `apartment-listing.jsonl` line by line. Validate each record against `schemas/apartment-listing.schema.json` (Ajv); count and log rejects instead of failing.
3. Filter: Los Angeles (by city/bbox) and `sourceType == Multifamily`. Print counts at each filter so we can see what we kept.
4. Group by community; upsert `communities`, then `listings` (idempotent on the CoStar ids). Never delete: rows missing from the kit get `active = false`.
5. Print a report: records read, rejected, with coordinates, with a photo, with a rent, floor plans per community. This is also the "how many LA rows have usable coordinates" answer for the mentors.

**Search over the data**: `search_apartments` (agent tool) and the map/deck queries hit `listings` + `communities` in SQL: rent range vs combined budget, beds, area, and a bbox for the map viewport.

**Honest labeling**: the kit may be a snapshot. Show "Rent from kit · availability not confirmed" wherever availability matters; do not call anything "available now."

### 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**

**Status (T5).** The earlier assumption below, that the kit has one photo per community, is wrong for the *property* records: `commercial-property.jsonl` `attachments[]` holds real galleries (building, interior, lobby, aerial: 28,893 photos for 766 of the 767 LA communities, median 31, max 200). `scripts/ingest-costar-media.ts` loads them into `listing_media` (`source = 'costar_kit'`), migration `0007` makes `listing_cards.photos` the primary photo plus the gallery, and the swipe deck flips through them (tap the left or right half of the photo; "More info ›" opens the listing). Photos are hotlinked from CoStar's CDN; copying to Supabase Storage (§15 item 5) is still undecided. `lib/costar/media.ts` has 4 tests.

**Decision (T5): the team ships the kit galleries and does not scrape.** The Apartments.com scraper below exists (`lib/enrich/apartments-com.ts`, `scripts/enrich-apartments-com.ts`, 6 tests) but is **off by default (`APARTMENTS_COM_ENRICH=on` to enable) and has never fetched a real page**: it needs a hand-made `data/apartments-com-overrides.json`, its test fixtures are synthetic (replace with saved real pages), and `docs/permissions/apartments-com.md` has blank evidence fields. It stops if blocked and never works around a CAPTCHA.

**Why:** the kit has one primary photo per community. Apartments.com has galleries and richer details, and the track organizers gave explicit approval to scrape it for images and related data. The `Listing` type and `ListingReel` already render `photos: string[]`, so extra images drop straight into the existing swipe deck and detail views.

**Permission record (do this first).** The approval was given verbally/in the track channel. Save the message or a screenshot (Discord link, who, when) in `docs/permissions/` and note the scope: **images and related listing details, hackathon use only**. If the scope turns out narrower, trim the module to it.

**Design: an offline, resumable batch job, never a request-time call.**

```
scripts/enrich-apartments-com.ts
  for each community in the demo area (LA), highest priority first:
    1. resolve the apartments.com page   → lib/enrich/apartments-com.ts: resolve()
    2. fetch HTML (throttled, cached on disk under .cache/apartments-com/)
    3. extract photos + floor-plan images + amenity/pet text   → parse()
    4. write listing_media rows (+ optional community detail columns)
```

1. **Resolve.** If the kit includes a listing URL, use it. Otherwise search by name + address and accept a result only if address and coordinates agree. Store `match_confidence`; ignore matches under the threshold and list them in a `needs_review` report. Keep a hand-edited `overrides.json` (community id → page URL) for the demo properties.
2. **Fetch politely.** One or two requests at a time, a delay with jitter between requests, an honest `User-Agent` with a contact, and an on-disk HTML cache so a rerun never re-hits pages already fetched. Process only the communities we will actually show (the demo shortlist first, then the rest of LA), not the whole site.
3. **Parse.** Prefer structured data in the page (JSON-LD or embedded JSON) over CSS selectors, which break. Save a few real pages as fixtures in `lib/enrich/__fixtures__/` and unit-test `parse()` against them.
4. **Store.** Insert `listing_media` with `source = 'apartments_com'`, `source_page_url`, `position`, and `kind` (`photo` or `floorplan`). Dedupe against the kit's primary photo. Decide per demo reliability whether to hotlink or copy images into Supabase Storage (copying avoids broken images during the demo; keep it to hackathon use).
5. **Show.** `ListingPhoto`/`ListingReel` read `photos[]` from the `listings` view (which prefers enriched media and falls back to the kit's primary photo). Add a small "Photo: Apartments.com" credit linking to `source_page_url`.

**Guardrails**

- If a page blocks us (CAPTCHA, login wall, bot challenge), **stop and fall back to the kit photo**. Do not try to get around bot detection.
- Don't collect personal data (agent names, phone numbers, emails). The kit excludes agent contact on purpose.
- A kill switch: `APARTMENTS_COM_ENRICH=off` makes the script exit and the UI uses kit photos only.
- Failures are normal: layout changes, missing pages, wrong matches. The app must look fine with zero enriched images.
- Hackathon use only. Do not ship scraped content in a public product.

### 6.3 Vexcel — aerial evidence and prose search **[planned]**

Vexcel is a **core** layer: it powers **Ducktect** (§8.9), where a user types a wish in prose and the agent checks it against aerial imagery around candidate listings. It is also the second data source the CoStar track expects us to combine with the kit.

**Access.** Keys come from the Vexcel keys card in the track Discord (`/costar-keys`); store as `VEXCEL_API_KEY`, server only. The hackathon keys cover **Los Angeles and Houston only**; anywhere else returns 403.

**Calls**

| Purpose | Call | Status |
|---|---|---|
| Aerial image of a lot | `POST https://api.vexcelgroup.com/v2/ortho/extract`; key in the `X-API-KEY` header; JSON body `wkt` (polygon around the point), `srid: 4326`, `layer: "urban,urban-r,wide-area,urban-g"`, `crop: "bounding_box"`, `image-format: "jpeg"`, `destination-dimensions`, `attribution: "false"`; returns JPEG bytes | Seen in the track quickstart |
| Prose search over imagery | `GET /v2/embedding/extract` with `search-text`, `wkt`, `buffer-meter`, `layer`, `api_key` | From the original guide **[verify]**: response shape, scoring, layer names, buffer limits, auth style (header vs query) |
| Property attributes | `GET /v2/property/extract` with `wkt`, `srid`, `api_key` (trees, pools, other exterior attributes) | From the original guide **[verify]** |

Ask in the track Discord (`#costar-group`, `/ask-costar`); the quickstart says to ask Lucas Hayne about semantic search. Vexcel's own tutorial and Python quickstart (linked from the keys card) cover parcels, attributes and embedding search.

**What prose can and cannot be checked.** Semantic search is geographically scoped: the agent must pick candidate areas first, then query around each.

| Checkable from aerial imagery (evidence) | Not checkable (say so, don't guess) |
|---|---|
| swimming pool, tennis court, tree cover / greenery, large yard or open space, park nearby, shopping center nearby, parking lot | quiet, safe, "good light inside", noise, walkability, building condition, whether an amenity is open to residents |

Evidence is worded as "Aerial imagery suggests a pool nearby (not confirmed as a resident amenity)." Never infer subjective properties.

**Cost and latency control**

1. SQL narrows to at most about 25 candidates (viewport + hard filters) before any Vexcel call.
2. One small buffer per query (start at 100–200 m, tune).
3. Limited concurrency (3–5 in flight), a per-request call budget, and a timeout; skip the aerial step rather than hang.
4. Cache every result in `aerial_queries` (community + normalized phrase + buffer); pre-warm common phrases for the demo area with `scripts/enrich-vexcel.ts`.
5. Ortho thumbnails for the evidence card are fetched server-side at about 600 px and cached in Supabase Storage.
6. Rate limits and costs are unknown **[verify]**; ask mentors before the demo.

If Vexcel is down or over quota, Ducktect still works on kit data and shows "aerial check unavailable."

### 6.4 Out of scope

Matterport (3D tours, Model API, Showcase SDK) is not part of this build. The listing and image story is the CoStar kit plus apartments.com images.

---

## 7. Matching and scoring (pure code, `lib/match/`)

### 7.1 Units and the feasibility rule (settled)

- `profiles.budget_max` = the most this person will pay per month as their share.
- **Flocks are any size from 2 up.** Three is fine; nothing assumes four. Every calculation uses the flock's **active members** (`flock_members.status = 'active'`); `flocks.max_size` only caps who may join.
- **Combined budget** = the sum of the active members' `budget_max`. Example: $1,500 + $1,800 + $1,400 = $4,700.
- **A listing is feasible if the combined budget covers its rent.**
- **Rent ranges.** `listings.price` is the lowest asking rent (`rent_min`, shown as "from"). `rent_min ≤ combined budget` passes. If `rent_max` also fits the criterion reads "fits"; if only the low end fits it reads "fits at the low end" and is a warning, since the exact unit may cost more.
- **Suggested split** (shown as "estimated rent per person"): each person's share is `rent × budget_max ÷ combined budget`. When the rent fits, nobody's share exceeds their own cap. For $4,500 and the caps above: $1,436 / $1,723 / $1,340. If an equal split also fits every cap, show that instead. It is a suggestion; the flock can agree on a different split.
- **Bedrooms.** Default: one bedroom per active member (`bedrooms_needed` null). A flock can set it lower (couples, shared rooms); the hard rule is `beds ≥ bedrooms_needed`.
- **Room to grow.** If `max_size` is above the active count, show headroom (combined budget minus rent). Nothing assumes a missing person's budget.
- Hard constraints filter first; soft preferences then rank.

### 7.2 Listing fit (hard constraints, then score)

Hard (a listing fails if any is false): feasibility (§7.1); `beds ≥ bedrooms_needed`; pets allowed if anyone needs it (unknown = warning, not fail); inside the accepted areas (canonical LA neighborhood names).

Soft, each scored 0–1 with a recorded reason: affordability margin, neighborhood match, move-in timing, extra amenities from kit/enrichment, `$ / sqft`. Output:

```ts
type Criterion = { key: string; ok: boolean | null; detail: string };   // null = unknown (missing data)
type Fit = { passes: boolean; criteria: Criterion[]; fitPct: number; suggestedSplit: { userId: string; share: number }[] };
```

`fitPct` is the share of *known* criteria (`ok !== null`) that are true, 0–100. The UI shows `criteria` as a checklist, and the agent's explanation is written from this structure, so it can't invent reasons.

**Reimplementing `groupMatch`.** The existing four-check `groupMatch` is rebuilt on `fit()`. `Match { met, total, pct }` keeps its shape (`met` = criteria that are true, `total` = criteria that are not null), so "Matches 3 of 4 flock prefs", the 30% term in `flockScore` and `lib/compare.test.ts` keep working.

**No results.** If nothing passes, return the **closest misses**: listings failing the fewest hard constraints, each with the failing constraint and a suggested relaxation (raise the budget by up to 10%, widen areas, drop pets). The agent offers these instead of only saying "nothing found."

### 7.3 Voting and the flock score

Voting is **thumbs up / thumbs down** (§2.3), stored in `swipes` with a `flock_id`.

`flockScore = round(70 × (thumbs-up ÷ active members) + 0.3 × fitPct)` per the Figma dev note, in `lib/compare.ts`. It is **computed on read** from the current votes and members, never stored, so it cannot go stale when someone votes or the flock changes. Per-user custom weights in Compare stay as designed.

**Thumbs-down rule.** Any thumbs-down marks the item "contested". When thumbs-down reaches half the active members, rounded up (1 of 2, 2 of 3, 3 of 5), the item leaves the active shortlist. It is kept in history so it is not suggested again. Changing a vote updates that person's row.

**Membership changes.** When someone joins or leaves, fit and scores recompute on read automatically. The shortlist is reviewed once by `process_feedback`, because the combined budget changed (§8.8).

### 7.4 Roommate compatibility, open-flock joining, privacy

`compat(person, flock)` returns pass/fail per rule the owner switched on in 00h: budget overlap, bedrooms + move-in within 30 days, at least one shared area, and no clash with dealbreakers. Habits feed a soft similarity score for ranking candidates.

**Deterministic by design.** Dealbreakers and habits are **structured tags** (smoking, pets, overnight guests, noise, early/late sleeper, cleanliness 1–5, and so on). The free text a person writes ("About you", "Dealbreakers") is for humans. When they save it, an LLM extracts tags into `dealbreaker_tags` and `habits`; the user can see and edit them. `compat()` compares only the tags, in code, so the result is repeatable.

**Joining is one transaction.** `join_flock(flock_id)` is a Postgres function (security definer): it locks the flock row, checks `open_to_join`, `max_size` and the owner's rules against the caller's profile, and inserts the member, or a `requested` row if the rules fail. Two people joining the last spot at the same time cannot both succeed.

**Privacy.** A requester never receives another person's budget, habits or dealbreakers before that person accepts. `find_roommates` and Find a Flock read the `public_profiles` view (discoverable users only) and compute compatibility on the server. Their output carries coarse reasons ("budgets overlap", "similar schedules"), not raw values.

**Consent decision (needs the team's sign-off).** The track guide says every person must accept before a group forms. Our Open flock design lets compatible people join instantly. Proposed reconciliation: *the owner's rules are standing consent from existing members* (shown to them when they join the flock), joiners see only the public profile before joining, and full profiles are shared after. Any member can remove someone. Agent-proposed groups always require an explicit accept from every person (`proposals`, §5.3).

---

## 8. The agent (LangChain Deep Agents)

We build the agent with **LangChain Deep Agents** (`deepagents` on npm, TypeScript), the framework for the LangChain track. **All agentic behavior goes through it**: group matching, apartment search, aerial checks, shortlist updates, feedback, and Ducktect. Model calls and secrets stay on the server.

### 8.1 How we use each Deep Agents capability

| Deep Agents capability | Our use |
|---|---|
| Planning (`write_todos`, opt-in via `todoListMiddleware()` since v0.7) | The agent writes a visible plan ("parse wish → search floor plans → aerial check top candidates → rank → save"); we stream it to the UI as live progress |
| Subagents (`task` tool) | Three isolated specialists (§8.2); keeps the orchestrator's context small |
| Virtual filesystem (`StateBackend`, default) | Candidate sets and Vexcel results are written to files such as `/work/candidates.json` instead of pasted into context; large tool results are offloaded automatically |
| Human-in-the-loop (`interruptOn`, needs a checkpointer) | Sending invites to proposed roommates pauses for the requester's approve/reject |
| Runtime context (`contextSchema`) | `userId` and `flockId` are passed per request and read by tools, never supplied by the model |
| Structured output (`responseFormat`) | Final answers are ids + reasons; the UI renders facts and scores from the database |
| Memory | Per-flock learned preferences (§8.7) |

### 8.2 Topology

```
Flock agent (orchestrator: plans, owns writes, talks to the user)
 ├─ roommate-matcher     find and score candidates, propose groups
 ├─ apartment-searcher   wish → hard filters → ranked floor plans with per-criterion reasons
 └─ aerial-evidence      Vexcel checks for the visual parts of a wish, around candidates
```

Subagents are plain objects: `{ name, description, systemPrompt, tools, model? }`. A subagent's `tools` override the inherited ones and its `systemPrompt` is not inherited, so each gets only what it needs (least privilege).

### 8.3 Tools (LangChain `tool()` + zod)

| Tool | Owner | Does | Backed by |
|---|---|---|---|
| `parse_preferences` | searcher, orchestrator | The model fills a schema (budget, beds, areas, move-in, pets, visual phrases, non-visual wishes); the tool validates and normalizes it | zod + `lib/match` |
| `search_profiles`, `score_compat`, `propose_group` | roommate-matcher | Candidates from `public_profiles` (discoverable users only), coarse reasons only (never raw budgets or habits), **proposals only** (`proposals` tables) | `lib/match/compat.ts` |
| `search_apartments`, `rank_apartments`, `get_listing_media` | apartment-searcher | SQL filter on floor plans, hard-constraints-then-score, photos | `lib/match/listing-fit.ts`, `listing_media` |
| `aerial_search`, `property_attributes` | aerial-evidence | Vexcel semantic search / attributes with cache and budget | `lib/enrich/vexcel.ts`, `aerial_queries` |
| `update_shortlist` | orchestrator | **Write** picks + explanations to `shortlist` | Supabase |
| `send_invites` | orchestrator | **Write**; interrupts for approval | Supabase |
| `process_feedback` | orchestrator | Record a rejection or changed preference, re-search, update the shortlist | `flock_feedback` + the above |

### 8.4 Safety rules

- `userId` and `flockId` come from `runtime.context`, never from model arguments.
- Tools query Supabase with a **user-scoped client** built from the caller's access token, so RLS applies; the service-role key is never used inside tools. Thread ids are derived on the server (`flock:<flockId>:user:<userId>`), never accepted from the client.
- `propose_group` creates proposals only; nobody joins a flock without an accept. `send_invites` interrupts for the requester first.
- Tools return structured JSON including `criteria[]` with `ok: true | false | null`. The prompt forbids stating any rent, score or amenity that is not in a tool result. Final answers carry ids; the UI loads the numbers itself.
- Scraped text and profile prose are quoted data, never instructions.
- Hard limits: recursion/iteration cap, a Vexcel call budget per request, and a request timeout. Log each run to `agent_runs`.

### 8.5 Runtime sketch

API shapes below are from the Deep Agents JS docs (`createDeepAgent`, `systemPrompt`, `subagents`, `contextSchema`, `interruptOn`; `tool` comes from `langchain`). Install: `npm install deepagents langchain @langchain/core @langchain/anthropic zod`.

```ts
// lib/agent/flock-agent.ts
import { createDeepAgent, type SubAgent } from 'deepagents';
import { todoListMiddleware, tool } from 'langchain';
import type { ToolRuntime } from '@langchain/core/tools';
import { MemorySaver } from '@langchain/langgraph';
import * as z from 'zod';

export const contextSchema = z.object({ userId: z.string(), flockId: z.string() });
type Ctx = ToolRuntime<unknown, typeof contextSchema>;

const searchApartments = tool(
  async (input, runtime: Ctx) => {
    const { flockId } = runtime.context!;                 // from the request, not the model
    return JSON.stringify(await searchFloorPlans(flockId, input));
  },
  {
    name: 'search_apartments',
    description: 'Find floor plans within a combined monthly budget, bedroom count and areas. Rents are ranges from the CoStar kit; availability is not confirmed.',
    schema: z.object({ maxRent: z.number(), beds: z.number().int(), areas: z.array(z.string()).optional() }),
  },
);

const apartmentSearcher: SubAgent = {
  name: 'apartment-searcher',
  description: 'Turns a housing wish into hard filters and returns ranked floor plans with per-criterion reasons.',
  systemPrompt: SEARCHER_PROMPT,
  tools: [parsePreferences, searchApartments, rankApartments, getListingMedia],
};
// roommateMatcher and aerialEvidence are defined the same way.

export const flockAgent = createDeepAgent({
  model: process.env.AGENT_MODEL ?? 'anthropic:claude-sonnet-5',   // provider:model string (see §8.6)
  systemPrompt: FLOCK_PROMPT,
  tools: [updateShortlist, sendInvites, processFeedback],
  subagents: [roommateMatcher, apartmentSearcher, aerialEvidence],
  middleware: [todoListMiddleware()],
  contextSchema,
  interruptOn: { send_invites: { allowedDecisions: ['approve', 'reject'] } },
  checkpointer: new MemorySaver(),                        // demo only (see §8.6)
});
```

```ts
// app/api/agent/route.ts
import { flockAgent } from '@/lib/agent/flock-agent';
import { requireUser, assertActiveMember } from '@/lib/server/auth';

export async function POST(req: Request) {
  const user = await requireUser(req);                     // 401 if signed out
  const { flockId, message } = await req.json();
  await assertActiveMember(user.id, flockId);

  const stream = await flockAgent.stream(
    { messages: [{ role: 'user', content: message }] },
    { streamMode: ['updates', 'messages'], context: { userId: user.id, flockId }, configurable: { thread_id: `flock:${flockId}:user:${user.id}` } },
  );
  // Forward each [mode, data] chunk as one NDJSON line: todos, subagent steps, tokens, __interrupt__.
  return new Response(toNdjson(stream), { headers: { 'Content-Type': 'application/x-ndjson' } });
}
```

An approval resumes the same thread: `POST /api/agent/resume` calls `flockAgent.invoke(new Command({ resume: { decisions } }), { configurable: { thread_id } })` (`Command` from `@langchain/langgraph`), one decision per pending action, in order. The thread id is derived server-side the same way, and resume verifies that the pending action belongs to the caller.

### 8.6 Runtime notes and risks **[verify]**

- **Serverless.** The docs describe Deep Agents as an in-process library and do not address serverless. `MemorySaver` and `InMemoryStore` live in memory, so pauses and threads are lost across serverless invocations. For the demo, run on a long-lived Node process; for anything durable, use a persistent checkpointer. `FilesystemBackend` and `execute` sandboxes are not for serverless.
- **Model choice.** The docs' own examples use `anthropic:claude-sonnet-5`, so that is the default. Opus 5.5 and Sonnet 5.5 reject forced `tool_choice` and non-default sampling parameters; LangChain's structured-output paths may use either. Smoke-test `responseFormat` and subagents on a candidate model before switching `AGENT_MODEL`.
- **Docs drift.** Some JS pages still show Python-style names (`system_prompt`, `interrupt_on`). Trust the TypeScript code blocks and pin versions. `write_todos` is opt-in as of v0.7.
- **Observability.** LangSmith tracing would let judges see plans, subagent calls and tool calls. Optional; setup per the LangSmith docs **[verify]**.
- **Streaming shapes.** `stream` with `['updates','messages']` yields `[mode, data]` tuples. The newer `streamEvents` (version `v3`) exposes per-subagent and tool-call handles that suit the progress UI better; evaluate it once the basic stream works.

### 8.7 Memory

Phase 1: learned preferences live in our own tables (`flocks.filters`, `flock_feedback`) and are read and written through `process_feedback`, so they are durable and visible in the UI. Stretch: mirror them into Deep Agents memory (`/memories/` on a `StoreBackend` via `CompositeBackend`), scoped per flock **[verify]** that the namespace can be keyed by `flockId`.

### 8.8 Agent UI

- **Ask Flock sheet** (from the Flock tab and Flock Picks): the plan renders as a checklist, subagent steps as short status lines ("Aerial check 7 of 20"), results as cards in the shared shortlist.
- An interrupt renders an approval card ("Invite Maya and Sam to The Nest?"); approve or reject resumes the thread.
- A thumbs-down is written to `swipes` directly (with an optional reason chip); the client then calls `POST /api/agent/feedback`, which runs a short, rate-limited `process_feedback` task: record the reason in `flock_feedback`, apply the removal rule (§7.3), re-search if needed, and update the shortlist. Everyone sees the change through realtime (§11).
- A change in membership triggers the same task once to review the shortlist against the new combined budget.

### 8.9 Ducktect best option (search bar)

**Why.** It gives the search bar an intent mode, and it makes the Deep Agent and Vexcel visible in the main product flow rather than a side feature.

**Today.** `components/MapSearch.tsx` **[built]** is one combobox with three option kinds: matching homes (client-side `matchesQuery`), "Show all N matching homes", and Google Places predictions.

**Change.** Add a fourth option, `{ kind: 'ducktect', text }`, pinned at the **top** of the dropdown whenever the user has typed something. Label: **"Ducktect best option"**, with the typed text quoted beneath it. It is reachable by keyboard like the others. A new prop `onDucktect(text)` hands the text to the map page. The spelling "Ducktect" is as written by the team; confirm before it ships (§15).

**Flow**

1. User types any prose ("sunny 3 bed with a pool and trees near a park, under 4,700") and picks the option.
2. Client calls `POST /api/ducktect` with `{ flockId, text, viewport, filters }`; the response streams.
3. The Ducktect agent plans, then `apartment-searcher` splits the prose into **hard filters** (rent, beds, areas, pets), **visual phrases** (`swimming pool`, `tree cover`, `park`) and **not checkable** wishes (`quiet`).
4. SQL narrows candidates to the viewport and hard filters, capped at about 25.
5. `aerial-evidence` runs Vexcel semantic search for each visual phrase around each candidate (cached in `aerial_queries`) and reads property attributes (§6.3).
6. `rank_apartments` combines hard-filter pass, flock fit score, and an evidence bonus with documented weights in code. Output is the top K with `criteria[]` for every check, including "not checked."
7. The map restyles: top results numbered, best option highlighted. A bottom sheet shows the best option: photo (kit or apartments.com), rent range, fit %, reasons, an aerial thumbnail with the evidence line, "also considered," and "Not checked: quiet." Actions: open listing, **Add to flock picks**, refine.

**Read-only by design.** Ducktect uses its own agent instance (`ducktect-agent.ts`) with only the searcher and aerial subagents and **no write tools**. Saving to the shortlist is an explicit tap, which then calls the normal write path. Least privilege and no surprise changes to the flock's data.

**Context and scope rules**

- **Solo mode.** With no flock yet, Ducktect runs on the user's own profile as a one-person flock. With a flock it uses the flock's combined budget and members.
- **Area precedence.** A place named in the text ("in Silver Lake") overrides the map viewport (resolved with Google geocoding; the map moves there). Otherwise the viewport is the area.
- **Candidate cap.** If more than about 25 listings pass the hard filters, pre-rank them by fit score and aerial-check the top 25. The result states "checked 25 of 63" so a hidden candidate is never implied to have been considered.
- **Evidence caveat.** In dense areas a search buffer may pick up a neighbor's pool or trees. Prefer parcel-level property attributes where available, and word results as "nearby."
- **Cost.** Per-user rate limit and a daily call budget on `/api/ducktect` and `/api/agent`.

**Result contract** (`responseFormat`). The model returns ids and reasons; the UI loads facts, scores and evidence from the database and tool outputs by id, so a model slip cannot show a wrong number:

```ts
export const DucktectResult = z.object({
  interpreted: z.object({
    hard: z.object({ maxRent: z.number().optional(), beds: z.number().int().optional(), areas: z.array(z.string()).optional() }),
    visual: z.array(z.string()),
    notChecked: z.array(z.string()),
  }),
  picks: z.array(z.object({ floorPlanId: z.string(), reasons: z.array(z.string()) })).max(5),
});
```

**Degraded modes.** Vexcel unavailable: rank on kit data and show "aerial check unavailable." No visual phrases in the text: skip the aerial step. No results: name the constraint that eliminated everything, taken from `criteria[]`.

**Latency.** Aim for under about 30 seconds with streamed steps; pre-warm the demo area for common phrases (`swimming pool`, `tree cover`, `park`, `tennis court`, `shopping center`).

### 8.10 LangChain track checklist

- One Deep Agent doing real work with real data (kit listings, apartments.com images, Vexcel imagery), not a chat wrapper.
- Visible planning (todo list in the UI), three subagents, filesystem-based context management, human-in-the-loop approval on a consequential action, per-request runtime context, structured outputs.
- Write actions (`update_shortlist`, `send_invites`) and a read-only variant (Ducktect) showing deliberate permission design.
- Demo shows the plan and subagent steps streaming, then the result.

## 9. API surface

| Route | Purpose |
|---|---|
| `POST /api/agent` | Deep Agent chat; streams plan, subagent steps, tokens, interrupts |
| `POST /api/agent/resume` | Approve or reject a paused action (e.g. invites) |
| `POST /api/agent/feedback` | After a thumbs-down: reason chip → short `process_feedback` task; also run on membership changes |
| `POST /api/proposals/[id]/respond` | Accept or decline an agent-proposed group; creates the flock when all accept |
| `POST /api/ducktect` | Read-only agent for the search bar's "Ducktect best option"; streams steps, returns ranked picks |
| `POST /api/flocks` | Create flock (friends/open) with validation |
| `POST /api/flocks/[id]/join` | Calls the `join_flock` database function (one transaction: lock, rules, `max_size`) |
| `POST /api/flocks/[id]/invites` | Invite by username/email |
| `GET /api/flocks/discover` | Open flocks ranked by compatibility with the caller |
| Reads/writes for thumbs votes (`swipes` + `flock_id`), stash, tours | Stay in `lib/api.ts` over Supabase under RLS |

Tours: the kit has no agent contact data, so the "open tour dates from the agent" in the Book Tour sheet are **simulated slots** (a `tour_slots` table seeded per demo listing) and must be labeled as sample data until we have a real source.

---

## 10. Auth, consent, security

- Supabase Auth (email + password, matching 00b/00c). Replace `CURRENT_USER_ID` with the session user; keep `UserSwitcher` only behind `NEXT_PUBLIC_DEMO=1` so two phones can act as two seeded people.
- `proxy.ts`: redirect signed-out users to `/signin` (optimistic only).
- **Server auth.** The app uses a browser Supabase client with the session in localStorage, so Route Handlers cannot see it. The client sends `Authorization: Bearer <access token>`; `requireUser` verifies it with `supabase.auth.getUser(token)` and builds a user-scoped client from the same token. (The alternative is `@supabase/ssr` cookies; pick one before building `proxy.ts`.)
- **Accounts.** Real profiles use `profiles.id = auth.users.id`. Seeded fictional profiles for the matching demo are `profiles` rows with no auth user, flagged `is_demo` and `discoverable`.
- **Abuse limits.** Per-user rate limits and a daily budget on `/api/agent`, `/api/agent/feedback` and `/api/ducktect`, since each call spends model credits.
- RLS on every table (§5.4). Service-role key only in server code and scripts.
- Secrets: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VEXCEL_API_KEY`, `COSTAR_ZIP_PASSWORD` are server/script only. Existing public vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID`.
- Treat profile prose and scraped page text as untrusted input: never put it in a position where it can act as instructions to the agent (pass as quoted data), and never render scraped HTML.

---

## 11. Realtime

Existing pattern (`subscribeToMessages`, `subscribeToGroupSwipes`) is right. Extend to `shortlist`, `swipes` (thumbs votes) and `listing_comments`, one channel per flock, filtered by `flock_id` (fixes the unfiltered swipes subscription, §3.1). Debounce refetches as `app/page.tsx` already does.

---

## 12. Testing

- Keep `node --test` for pure code. Add tests for: `compat`, `listing-fit` (hard constraints, unknown handling, closest misses), feasibility and suggested-split math (the $4,700 / $4,500 example, and 2-, 3- and 5-person flocks), rent-range handling (low end passes, high end warns), the thumbs-down removal threshold, `join_flock` under concurrent calls, kit mapping (`lib/costar/map.ts`), and `apartments-com.parse()` against saved fixtures.
- Ingestion has a built-in check: the report counts (§6.1). Eyeball 10 random rows against the raw record.
- Agent: a small fixture set (three profiles, ten floor plans, expected top pick and expected exclusions); assert that `update_shortlist` is called and that no rent/score appears in the answer that isn't in a tool result.
- Ducktect: fixtures for the prose splitter (hard / visual / not-checkable) on 10 sample queries; Vexcel mocked with canned responses; assert the Ducktect agent has no write tools; assert the degraded modes (Vexcel down, no visual phrases, no results).
- Deep Agents smoke test: one `createDeepAgent` call with one tool, a subagent and `contextSchema` on the chosen model, before building on it.
- Manual: two phones as two members, one rejects a pick, the other's shortlist updates.

---

## 13. Roadmap

Order is by what the demo needs; the demo path is bold.

**Where we are (as of this branch):** T1 schema, seed and RLS files written and run on a local Postgres, not diffed against a real dump; T2 done; T3 done locally; T4 code done and used locally, real-project cutover not done; T5 galleries done from the kit, Apartments.com scraper optional and unrun. Everything marked done was tested against a **local** Supabase (`docs/LOCAL_DATABASE.md`), not your real project.

| Phase | Work | Done when |
|---|---|---|
| **0 Foundation** | Export schema and seed to `supabase/migrations/`; confirm and enable RLS; `.gitignore` for `data/` and `.cache/`; rename to Flock; env vars; clear the Brooklyn seed rows (swipes, stash, tours, messages) when the real listings land | A teammate can recreate the DB from the repo |
| **1 Real listings** | **Read the kit docs; `ingest-costar.ts`; `listings` view; switch the map center and seed group to LA** | Map and swipe deck show real LA floor plans |
| 2 Image enrichment | Permission note; `enrich-apartments-com.ts` for the demo properties first; gallery in `ListingReel`; photo credit | Demo listings have several photos, and the app looks fine without them |
| **3 Flocks and matching** | `flocks`/`flock_members` migration; `swipes.flock_id` and thumbs votes; `proposals`; `join_flock`; Friends/Open creation; `compat`, `listing-fit`; seeded fictional profiles for the demo | Create a flock, join an open one by rules, see why a place fits |
| **4 Deep Agent** | Smoke test `deepagents` + model; orchestrator and `roommate-matcher` / `apartment-searcher` subagents; `update_shortlist`, `send_invites` (interrupt), `process_feedback`, `agent_runs`; streaming "Ask Flock" sheet | "We need 3 bedrooms under $4,700" yields a plan, a roommate proposal and a saved, explained shortlist |
| **5 Vexcel + Ducktect** | `lib/enrich/vexcel.ts`, `aerial_queries`, `aerial-evidence` subagent, pre-warm script; "Ducktect best option" in `MapSearch`; `/api/ducktect`; result sheet and map restyle | Typing a prose wish and picking Ducktect returns ranked picks with aerial evidence |
| 6 Auth | Supabase Auth screens, `proxy.ts`, remove hard-coded ids, demo switcher behind a flag | Real sign-in works; two phones still demo |
| 7 Optional | Rent split by room; tour slots; comparison polish; LangSmith traces; Deep Agents memory | Only if time remains |

**Minimum demo (if time is tight):** phases 0, 1, 3 (seeded profiles), 4 and 5. Everything else is polish.

---

## 14. Two-minute demo

1. **0:00** The problem: you need compatible people *and* an apartment that fits all of them.
2. **0:20** Sign in, open Your Flocks; create an Open flock with a short, wordy profile and join rules.
3. **0:45** Ask Flock: "Three of us, $4,700 combined, three bedrooms." The Deep Agent's plan streams; the roommate-matcher proposes a group; the user approves the invites and the flock accepts.
4. **1:10** In the map search bar, type "sunny 3 bed with a pool and trees near a park" and pick **Ducktect best option**. The searcher splits hard filters from visual phrases; the aerial-evidence subagent checks Vexcel imagery around the CoStar candidates; the best option appears with its aerial thumbnail and evidence line (photos from the kit and apartments.com). Add it to flock picks.
5. **1:35** A roommate rejects one; the shortlist updates live on the other phone.
6. **1:55** "Flock finds your people and your place, with real property data and an agent that takes action."

---

## 15. Open questions, risks, decisions

**Decisions the team should make now**

1. **Demo city = Los Angeles** (kit and Vexcel cover only LA and Houston). Re-seed groups and change the map center.
2. **`budget_max` means a per-person rent share** (§7.1). Reseed profiles accordingly.
3. **Open-flock consent model** (§7.4).
4. **Tours are simulated** until a real source exists (§9).
5. **Photos: hotlink or copy to Supabase Storage** (§6.2). Copy is more reliable for the demo. **Current state: hotlinked** from CoStar's CDN (it works in testing); copying is not built. Revisit if images break before the demo.
6. **Agent hosting.** A long-lived Node server for the demo (§8.6), or add a durable checkpointer.
7. **Ducktect label and placement.** "Ducktect best option" is spelled as written by the team; confirm, then add the dropdown state and result sheet to Figma.
8. **Settled:** a place is feasible if the flock's combined budget covers the rent, and flocks are any size from 2 up (3 is fine; nothing assumes 4).
9. **Settled:** voting is thumbs up / thumbs down (§2.3).
10. **Defaults chosen in this patch (confirm or change):** one card or pin per *community* showing the best-fitting floor plan, with votes and shortlist items on the floor plan; a place leaves the active shortlist when thumbs-down reaches half the flock (rounded up); a group proposal needs every invitee to accept, with a "continue as a smaller flock?" prompt if someone declines; the Brooklyn seed rows are wiped at cutover; tools use a user-scoped Supabase client; per-user rate limits on agent endpoints.

**To confirm with CoStar mentors / kit docs**

- Real field names and the mapping table in §6.1; which field gives rent per floor plan; whether pet policy or amenities exist.
- Whether the kit is a snapshot or current availability; photo display rules.
- How many LA rows have usable coordinates.
- That `source.sourceType == 2 (Multifamily)` is the right apartment filter, and whether other types include rentals.
- The exact scope of the apartments.com approval (images only, or details too); save the message.
- Vexcel: semantic search response shape and scoring, layer names, buffer limits, auth style, rate limits and cost.

**Risks**

| Risk | Mitigation |
|---|---|
| Kit fields differ from what we assumed | Read the docs first; keep `raw jsonb` so remapping needs no re-download |
| Apartments.com blocks or changes layout | Offline job, caches, fallback to kit photo, fixtures for the parser |
| A wrong apartments.com match shows the wrong building | Confidence threshold, review list, manual overrides for demo properties |
| Missing availability shown as fact | "Not confirmed" labels, no "available now" copy |
| Open-flock auto-join conflicts with mutual consent | §7.4; owner rules shown to members; removal |
| Anon key without RLS | Verify now (§3.1) |
| Agent invents a number or amenity | Scores and criteria come from code; prompt forbids unsourced claims; tests |
| Cost/latency of agent calls | Iteration cap, effort `medium`, prompt caching |
| Deep Agents API drift or serverless limits | Smoke test first; pin versions; long-lived Node host (§8.6) |
| Chosen model rejects LangChain's request params (forced tool choice, sampling) | Default to the docs' example model; test before switching |
| Ducktect is slow (many Vexcel calls) | Candidate cap, concurrency and budget, cache, pre-warm, streamed progress |
| Prose the imagery can't answer ("quiet") | Explicit "not checked" list; never infer |
| Time | Build the minimum demo path first |

---

## Appendix: environment variables

| Name | Where | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | existing |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` | browser | existing map |
| `SUPABASE_SERVICE_ROLE_KEY` | server/scripts | ingestion, agent writes |
| `ANTHROPIC_API_KEY` (read by `@langchain/anthropic`), `AGENT_MODEL` (optional, `provider:model`) | server | Deep Agent |
| `COSTAR_KIT_ZIP` or `COSTAR_KIT_URL`, `COSTAR_ZIP_PASSWORD` | scripts | kit ingestion |
| `APARTMENTS_COM_ENRICH` (`on`/`off`) | scripts | image enrichment kill switch |
| `VEXCEL_API_KEY` | server/scripts | aerial evidence and Ducktect |
| LangSmith variables (optional) | server | agent traces **[verify]** |
| `NEXT_PUBLIC_DEMO` | browser | shows the user switcher |
