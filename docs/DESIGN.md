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

### 2.2 Friends flock vs Open flock

| | Friends flock | Open flock |
|---|---|---|
| How people join | The creator is in at once; invitees join when they accept | Anyone whose profile passes the owner's rules can join; others request |
| Setup prompts | Short, filter-based (budget, beds, areas, move-in) | Longer, free text: about the flock, about you, who you want, dealbreakers |
| Why | You already know each other | Strangers need to know who they are living with |
| Private details | Visible to members | Public profile = bio + prefs only; full profile only after joining |

A flock a person creates exists as soon as they create it, with them as its only active member (admin). Invitees are added as they accept, so a flock with no acceptances yet still exists and shows in Your flocks. A third origin is **agent-proposed**: the agent suggests a group of compatible people; everyone must accept before the flock exists.

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
| `/reels` | For You swipe deck (`ListingReel`): tap the photo to flip, "More info ›" for the listing; Yes / Nope / **Pass** (skip with no vote) / Back; a thumbs-down opens the "Why the nope?" reason sheet; end-of-deck recap with review piles; toasts with Undo |
| `/map`, `/map/[id]` | Map + listing view (same deck, started at the tapped place) |
| `/listing/[id]` | Listing detail: swipeable gallery (floor plans are the last slide), price, distance from your pin, who liked it, Book a tour, **Like** (your thumbs-up) |
| `/tours`, `/tours/[id]` | Calendar (selected day's tours above Upcoming) and tour detail (RSVP toggle, Reschedule, Cancel) |
| `/group`, `/members`, `/invite` | Flock: rankings, preferences (incl. your **commute pin**), member list, invite link |
| `/compare`, `/compare/pick` | Compare with weighted score |
| `/account`, `/stash` | Account (incl. commute pin) and My Stash. Nothing adds to the stash any more: Stash buttons became Pass (reels) and Like (picks, detail) |

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

- Browser code keeps using `lib/api.ts`. Anything that needs a secret (OpenAI, Vexcel, service-role key) goes through a Route Handler. Secrets are never `NEXT_PUBLIC_*`.
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

**Status (open/closed and requests, local database only):** `0013_open_requests.sql`. The Flock screen has an admin-only open/closed switch (`set_flock_open`); open flocks are listed in Find a flock and people send a request (`join_flock` returns `requested`, or `mismatch` if they clash with the rules). An admin approves with `answer_join_request`; there is no admin screen for requests yet. The Tours calendar has a Week | Month toggle: Month is the dot calendar; Week is a Google-style time grid (8 AM to 8 PM) with one one-hour block per tour that opens the tour, and the arrows step by a week (a week that crosses into the next month shows no tours on those days). Figma frames `05e Flock · Closed` and `04e Calendar · Week View` match.

**Status (T9 and T10, local database only):** sign-up and sign-in. `0009_auth.sql` adds the `handle_new_user` trigger that creates a `profiles` row for each new account, and `0011_backfill_profiles.sql` gives existing accounts one (`flocks.created_by` is a foreign key to `profiles`, so a missing row fails the insert). `0010_flock_rules.sql` makes `flock_rules_ok` mirror `lib/match/compat.ts` and adds `leave_flock`. Create a flock: the creator is its only active admin, so it exists and shows in Your flocks with "1 flockmate" until someone accepts. After a Friends flock is created the app opens `/invite`, which now ends with a line saying the flock is ready and a **Start hunting** button to `/`. The Figma `05b Invite Friends` frame matches (button and line below Waiting to join; the content frame runs down to the tab bar). Still open: `/invite`, `/flocks`, `/group`, `/map` and `/` log Next.js "dropped segment" instant-navigation errors (only `/flocks/new` has its Suspense boundary, in the page file).

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
-- An agent-proposed group becomes a flock when every invitee has accepted. If someone declines, the people who
-- accepted are asked "continue as a smaller flock?" (minimum 2). Flocks a user creates do not wait (see §2.2).

create table listing_comments (flock_id uuid, user_id uuid, listing_id uuid, body text, created_at timestamptz default now());

create table flock_feedback (            -- rejections and reasons the agent learns from (§8.7)
  flock_id uuid references flocks on delete cascade, user_id uuid references profiles,
  listing_id uuid references listings, reason text, created_at timestamptz default now()
);                                       -- reasons are the chips in §8.3a; a "too expensive" expires when a newer member joins

create table member_pins (               -- one commute pin per person (migrations 0018, 0019): where they travel to most
  user_id uuid primary key references profiles on delete cascade,
  lat double precision not null, lng double precision not null, label text, updated_at timestamptz default now()
);                                       -- you change yours; people you share an active flock with can read it (friends and open flocks)

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

### 6.3 Vexcel — aerial evidence and prose search **[built: T14 evidence and cache, local database only; Ducktect is T15]**

Vexcel is a **core** layer: it powers **Ducktect** (§8.9), where a user types a wish in prose and the agent checks it against aerial imagery around candidate listings. It is also the second data source the CoStar track expects us to combine with the kit.

**Status (T14, built and run against the real API; local database only).** `lib/enrich/vexcel.ts` (client and parsers), `lib/enrich/aerial.ts` (cache-first evidence), `supabase/migrations/0016_aerial_queries.sql`, `scripts/enrich-vexcel.ts` (pre-warm), tests in `lib/enrich/vexcel.test.ts`, `lib/enrich/aerial.test.ts` (canned responses, no network) and `scripts/test-aerial.mjs` (database). The six demo properties (most active listings) are pre-warmed: `node --env-file=.env.local scripts/enrich-vexcel.ts --fetch --write --confirm <db-host>` (needs `INGEST_SUPABASE_URL` and `INGEST_SUPABASE_SERVICE_ROLE_KEY`; refuses any non-local host; plan-only without `--fetch`; `--show` prints what is cached). Per property it makes two Vexcel calls (one detect for all labels, one property lookup) and a re-run makes none.

What changed from the original guide, from Vexcel's hackathon tutorial and live calls (Nov 2026):

- **Auth** is the `X-API-KEY` header (never the URL). Outside the key's area (LA and Houston) both calls answer 403; `/property/extract` answers 404 when there is no property record at the point; 429 means slow down (the client waits 1 s, then 2 s, then gives up).
- **Per-property evidence uses `POST /v2/elements/detect`**, which finds a named thing ("swimming pool") in the imagery of a small square and returns a real 0 to 1 confidence. A label with no detections has no feature in the answer, so absence is read as "looked and saw none" and cached as such. We ask for boxes and confidences only (no pixel masks), on a 160 m square (`buffer_m` 80 is half the side), threshold 0.5; one call carries all labels.
- **Property attributes** (`GET /v2/property/extract`, trimmed with `include=pool,parcel-tree-cover,metadata`: about 20 KB instead of 90 KB; `structure` is not a valid include, and `structure.count` reads 0 unless structures are requested, so we do not keep it). One point returns several parcels, and Vexcel marks every one `inside-parcel: true`, so we aggregate: a pool counts if any parcel has one, tree cover is the median. These go in `listing_enrichment.vexcel_attributes`.
- **Prose search is `POST /v2/embedding/extract`, not GET**, with a polygon, one `search-text`, and `total-records`/`page-size`. Its scores are relative within one search (about 0.2 for a good tile), with no absolute cut-off, so it cannot answer "does this property have a pool". It suits discovery over an area (Ducktect, T15) and is not used by T14.
- Measured: property about 0.1 to 0.3 s, detect about 1.2 s, embedding about 0.5 s; no rate-limit headers were returned, and cost per call is still unknown (**[verify]** with the mentors before the demo).
- **`aerial_queries.score`** is Vexcel's detection confidence for that label (0 when none seen), not a score of ours; `result` holds `{ method, found, count, maxConfidence, threshold, imagery: { collection, capturedAt } }`. Failed calls are never cached.
- Wording follows the rules below: "Aerial imagery suggests a swimming pool nearby (not confirmed as a resident amenity)." Checkable now: swimming pool, tennis court, parking lot (detect) and tree cover (attributes). Park or shopping center nearby and large yard need an area search and arrive with T15; everything subjective is "can't be checked".
- Not built (outside T14): ortho thumbnails in Supabase Storage, the `aerial-evidence` subagent tool, and a route that serves evidence to the browser. `aerialEvidence()` is the function those will call; it never throws and says "aerial check unavailable" when it has no cache and no live answer.

**Access.** Keys come from the Vexcel keys card in the track Discord (`/costar-keys`); store as `VEXCEL_API_KEY`, server only. The hackathon keys cover **Los Angeles and Houston only**; anywhere else returns 403.

**Calls**

| Purpose | Call | Status |
|---|---|---|
| Aerial image of a lot | `POST https://api.vexcelgroup.com/v2/ortho/extract`; key in the `X-API-KEY` header; JSON body `wkt` (polygon around the point), `srid: 4326`, `layer: "urban,urban-r,wide-area,urban-g"`, `crop: "bounding_box"`, `image-format: "jpeg"`, `destination-dimensions`, `attribution: "false"`; returns JPEG bytes | Seen in the track quickstart |
| Named object on a property (the per-property check) | `POST /v2/elements/detect`: `wkt` (square), `srid`, `images[]` (an ortho extract request), `model-input.elements[]` (`label`, `model: "sam3"`, `detection-threshold`) | **Verified live** (T14) |
| Prose search over imagery (area discovery, T15) | `POST /v2/embedding/extract`: `wkt` polygon, `srid`, one of `search-text`/`search-location`/`search-url`/`search-vector`, `include: "score,geometry,collection"`, `total-records`, `page-size` | **Verified live**; scores are relative within a search, no absolute cut-off |
| Property attributes | `GET /v2/property/extract` with `wkt` (`POINT(lng lat)`), `srid`, `layer`, `latest`, `include`, `unit-system`; flat dotted keys such as `pool.detected`, `parcel-tree-cover.percent` | **Verified live** (T14) |

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

**Commute pins are visible to flockmates (decision).** A person can set one pin, from Account or the flock page's preferences (address search through OpenStreetMap, or a tap on the map). Anyone who shares an active flock with them can read it, in friends and open flocks alike: row-level security on `member_pins` lets you write only your own row and read your own and your flockmates' (`shares_flock_with`). Strangers cannot read it. An earlier version (0018) hid pins and gave out distances only once two members had one, so nobody's location could be worked out; the team decided flockmates may see each other's pins, so migration 0019 removes that limit and `flock_pin_distances` works with a single pin. People who are not in a flock yet (for example someone only browsing an open flock) see nothing. The pin sheet says "Your flock can see this pin".

**Status (Find a flock, agent read; local database only):** Find a flock now asks three long questions after "Your basics" (about you → `profiles.about`, what you want in roommates and a home → `profiles.looking_for`, added in `0015_looking_for.sql`, dealbreakers → `profiles.dealbreakers_text`). `POST /api/flocks/match` then has the agent (`lib/agent/matcher.ts`, one structured-output call on the same model as the flock agent) read what you wrote against each open flock's own public text and answer `strong | possible | weak` with a one or two sentence reason per flock. Code decides who may be considered; the model only judges fit in words: only flocks you already pass `compat()` for and that still have a seat are sent to it, and it never sees a member's profile, budget or habits (§7.4 privacy). Everything it returns is checked: ids it was not given are dropped, and a reason that states a dollar amount or percentage nobody gave it is replaced. It only recommends: applying is still the request button on the flock (`join_flock` files a request an admin approves, and answers `mismatch` if you clash with the flock's rules). If the agent cannot answer (no `OPENAI_API_KEY`, daily limit, model error) the page falls back to the rule-based ranking. Checked with `lib/agent/matcher.test.ts` and a stand-in model; a real model's judgement has not been tried. Roommate-matcher as a Deep Agents subagent that proposes groups (T13) is separate and still open.

`compat(person, flock)` returns pass/fail per rule the owner switched on in 00h: budget overlap, bedrooms + move-in within 30 days, at least one shared area, and no clash with dealbreakers. Habits feed a soft similarity score for ranking candidates.

**Deterministic by design.** Dealbreakers and habits are **structured tags** (smoking, pets, overnight guests, noise, early/late sleeper, cleanliness 1–5, and so on). The free text a person writes ("About you", "Dealbreakers") is for humans. When they save it, an LLM extracts tags into `dealbreaker_tags` and `habits`; the user can see and edit them. `compat()` compares only the tags, in code, so the result is repeatable.

**Joining is one transaction.** `join_flock(flock_id)` is a Postgres function (security definer): it locks the flock row, checks `open_to_join`, `max_size` and the owner's rules against the caller's profile, and inserts a `requested` row (or returns `mismatch` if the rules fail: no request). An admin then calls `answer_join_request` to approve or decline; `set_flock_open` is the admin's open/closed switch (migration 0013). Two admin approvals for the last spot cannot both succeed. There is no admin screen for requests yet.

**Privacy.** A requester never receives another person's budget, habits or dealbreakers before that person accepts. `find_roommates` and Find a Flock read the `public_profiles` view (discoverable users only) and compute compatibility on the server. Their output carries coarse reasons ("budgets overlap", "similar schedules"), not raw values.

**Consent decision (needs the team's sign-off).** The track guide says every person must accept before a group forms. Open flocks no longer let anyone join instantly: people send a request and an admin approves (0013). Proposed reconciliation: *the owner's rules are standing consent from existing members* (shown to them when they join the flock), joiners see only the public profile before joining, and full profiles are shared after. Any member can remove someone. Agent-proposed groups always require an explicit accept from every person (`proposals`, §5.3).

---

## 8. The agent (LangChain Deep Agents)

We build the agent with **LangChain Deep Agents** (`deepagents` on npm, TypeScript), the framework for the LangChain track. **All agentic behavior goes through it**: group matching, apartment search, aerial checks, shortlist updates, feedback, and Ducktect. Model calls and secrets stay on the server.

**Status (T12, built; tested offline and on a local database; the acceptance flow passed on a real model, openai:gpt-5-mini):** `lib/agent/` has the orchestrator, one subagent (`apartment-searcher`; `roommate-matcher` and `aerial-evidence` are T13 and T14), and the tools `search_apartments`, `rank_apartments`, `update_shortlist`, `send_invites` (paused for approval with `interruptOn`) and `process_feedback`. `parse_preferences` is not a separate tool: the model fills the arguments of `search_apartments` directly. Saved explanations are built in code from `lib/match` criteria, so the model supplies ids only. The API is `POST /api/agent` and `POST /api/agent/resume` (NDJSON). Migration `0012_agent.sql` adds `shortlist`, a per-person daily call budget (`take_agent_call`) and `invite_to_flock`. `next.config.ts` lists the agent packages in `serverExternalPackages` because langsmith has an optional `ws` import the bundler cannot resolve. Real Deep Agents API names matched this section. Verified against a real model: `openai:gpt-5-mini` passes `scripts/smoke-agent.ts` and `scripts/demo-agent.mjs` (the demo wish saved 5 passing picks; an invite paused, rejecting sent nothing, approving invited; no number in the answer was missing from the tool results). Not verified: other models, and answer quality beyond these checks. The first run saved nothing because the model asked permission instead of acting, so the prompt now says to save without asking.

**Status (T13, built; local database only):** `lib/agent/subagents.ts` defines the specialists. `apartment-searcher` can search and rank but not write. `roommate-matcher` has the read-only `find_open_flocks` tool and is registered only when the server supplies a finder. `aerial-evidence` is T14/T15. Fixture tests in `lib/agent/subagents.test.ts`: three profiles and ten floor plans with a known top pick and known exclusions, and `update_shortlist` is asserted to be called.

### 8.3a Thumbs-down reasons and the shortlist refresh (T13)

After a thumbs-down on the reels (`ListingReel`), a "Why the nope?" sheet (Figma 02e, 02f) offers reason chips: too far, too expensive, no pets, too small, bad photos, not my area, other. Picking some and tapping **Update my picks** calls `POST /api/agent/feedback`. Skip closes the sheet and the vote stands.

**It is plain code, not a model call.** `rerunShortlist` in `lib/agent/feedback.ts` records the reasons in `flock_feedback`, searches again for the flock as it is now (members, combined budget, bedrooms) minus what the reasons rule out, saves the top 5 (explanations built from the checks) and marks the agent's earlier picks that no longer qualify `removed`. The same function runs when someone joins the flock (leaving does not trigger it yet: that is a direct database call, not an API route) and from the `process_feedback` tool, so the result is the same whoever triggers it and a test can pin it. The model only words the answer.

| Reason | Rules out |
|---|---|
| too expensive | that place and every plan at or above its rent (expires when a newer member joins, because the budget changed) |
| too small | that place and plans no bigger than it |
| no pets | that place and plans known to ban pets; plans known to allow pets go first |
| too far | that place and plans as far or farther from the flock's commute pins (§7.4); with no pins, the same community |
| not my area | that place and the same community (the kit has no neighborhoods yet) |
| bad photos, other | that place only |

Feedback from people who have left the flock is ignored. One person's reason applies to the whole flock. Candidates are ordered by price then id, so the same flock always gets the same ones.

**The person is told what happened** (`outcome` in the response, worded by `feedbackMessage` in `lib/format.ts`): `updated` ("Picks updated · 2 new, 1 dropped"), `unchanged` ("Your picks already fit · nothing changed"), `nothing-fits` ("Nothing else fits · kept your picks": nothing passes, so the old shortlist is left alone) and `no-budget` ("Add a budget in Flock preferences to refresh your picks": nobody has set one, and a missing cap counts as 0).

**Commute pins** (§7.4, `member_pins`). `flock_pin_distances(flock, listings)` gives the farthest and average straight-line miles from each listing to the pins of the flock's members. If it is missing (a database without migration 0018), the lookup fails quietly and "too far" falls back to the community rule. shortcut: straight-line, not a route; real commute time would be a later, shortlist-only addition.

**Pass and Like.** The reels' Stash action became **Pass**: skip with no vote, nothing saved or shared, the place can return next visit, and Back has nothing to undo on the server. On Flock picks and the listing detail, the bookmark and "Stash" became **Like**, your thumbs-up vote (tap again to take it back).

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
| `process_feedback` | orchestrator | Record a rejection and its reason, then run the same plain-code refresh as the thumbs-down chip (§8.3a): search again without what the reason rules out, update the shortlist, answer with the outcome | `flock_feedback`, `lib/agent/feedback.ts` |
| `find_open_flocks` | roommate-matcher | Open flocks this person could join, best match first, with coarse reasons. Read-only: it suggests, it never saves or invites | `lib/server/discover.ts` (supplied by the server, so the agent holds no service key) |

### 8.4 Safety rules

- `userId` and `flockId` come from `runtime.context`, never from model arguments.
- Tools query Supabase with a **user-scoped client** built from the caller's access token, so RLS applies; the service-role key is never used inside tools. Thread ids are derived on the server (`flock:<flockId>:user:<userId>`), never accepted from the client.
- `propose_group` creates proposals only; nobody joins a flock without an accept. `send_invites` interrupts for the requester first.
- Tools return structured JSON including `criteria[]` with `ok: true | false | null`. The prompt forbids stating any rent, score or amenity that is not in a tool result. Final answers carry ids; the UI loads the numbers itself.
- Scraped text and profile prose are quoted data, never instructions.
- Hard limits: recursion/iteration cap, a Vexcel call budget per request, and a request timeout. Log each run to `agent_runs`.

### 8.5 Runtime sketch

API shapes below are from the Deep Agents JS docs (`createDeepAgent`, `systemPrompt`, `subagents`, `contextSchema`, `interruptOn`; `tool` comes from `langchain`). Install: `npm install deepagents langchain @langchain/core @langchain/openai zod`.

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
  model: 'openai:gpt-5-mini',   // provider:model string (see §8.6)
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
- **Model choice.** One model for now: `openai:gpt-5-mini` (needs `OPENAI_API_KEY`). It passed the T12 acceptance flow. GPT-5 models reject non-default sampling settings, so we set none; a smarter model such as `gpt-5` is a one-line change if the answers are not good enough.
- **Docs drift.** Some JS pages still show Python-style names (`system_prompt`, `interrupt_on`). Trust the TypeScript code blocks and pin versions. `write_todos` is opt-in as of v0.7.
- **Observability.** LangSmith tracing would let judges see plans, subagent calls and tool calls. Optional; setup per the LangSmith docs **[verify]**.
- **Streaming shapes.** `stream` with `['updates','messages']` yields `[mode, data]` tuples. The newer `streamEvents` (version `v3`) exposes per-subagent and tool-call handles that suit the progress UI better; evaluate it once the basic stream works.

### 8.7 Memory

Phase 1: learned preferences live in our own tables (`flocks.filters`, `flock_feedback`) and are read and written through `process_feedback`, so they are durable and visible in the UI. Stretch: mirror them into Deep Agents memory (`/memories/` on a `StoreBackend` via `CompositeBackend`), scoped per flock **[verify]** that the namespace can be keyed by `flockId`.

### 8.8 Agent UI

- An interrupt renders an approval card ("Invite Maya and Sam to The Nest?"); approve or reject resumes the thread.
- A thumbs-down is written to `swipes` directly (with an optional reason chip); the client then calls `POST /api/agent/feedback`, which records the reasons in `flock_feedback` and runs `rerunShortlist` (§8.3a, plain code, no model call): re-search without what the reasons rule out and update the shortlist. The removal rule (§7.3) is separate. Everyone sees the change through realtime (§11).
- A change in membership triggers the same task once to review the shortlist against the new combined budget.

### 8.9 Ducktect best option (search bar)

**Status (T15, built and run with a real model and live Vexcel; local database only).** It runs only when someone picks the **"Ducktect best option"** row in the search bar (pinned on top, the typed text quoted beneath it; Enter still takes the first home or place, so an address search never starts it). Plain search, filters and map browsing are unchanged. The request is general: it can be about a feature of the home, the way someone lives, or a kind of place they want near or away.

*The flow (a Deep Agent, `lib/agent/ducktect-agent.ts`, read-only):*

1. **Read the person.** `get_user_context` returns their real profile (budget, pets, habits, what they wrote about themselves, dealbreakers) and their flock's shared facts (size, combined budget), read as the user so row-level security applies. It is handed to the model as data, never as instructions.
2. **Work out their day.** `interpret_wish` records the model's reading of the person and the wish: a `lifestyle` sentence (assumptions), hard `filters` the listing data can apply (rent, beds, bathrooms, size, pets, named areas), and up to five `checks`. A check is a need, why it matters to this person, whether it came from the wish or was inferred from the profile, and how to look for it: **around** (search terms in the model's own words, how far they would go: walk, bike or drive, and whether they want it near or away) and/or **imagery** (labels for what should be visible from above). There is no category list: any need the model can put into words is allowed. `normalizeInterpretation()` holds the reading to the rules (only safe words reach a query, sensible limits, imagery labels must be plain visible things; a feeling or something indoors becomes "not checked").
3. **Scout the areas** (`area-scout` subagent, `scout_areas`). For every candidate place that passes the hard filters (up to 300 places, one per community), it looks at what is around it for each "around" check by searching the OpenStreetMap places in the local `places` table (below), measures real distances (to a park's outline, not its centre), and shortlists the 12 whose surroundings best serve that person, with fit. A need to stay away from something scores the other way round.
4. **Re-affirm from above** (`aerial-evidence` subagent, `confirm_with_satellite`). Only the shortlist is sent to Vexcel, and only for what the checks said should be visible: open-vocabulary detection (any label, one call for all labels, cached in `aerial_queries`) and property attributes (tree cover). Vexcel is the costly call, so it confirms; it does not choose. A label that no shortlisted place showed is flagged `unverified` (the detector may not recognise it) and is not used to rank, instead of marking every place down for it.
5. **Rank and explain.** `rank_candidates` scores with documented weights (`WEIGHTS` in code: a hard pass 1000, plus fit %, plus 25 for each need found near, 10 for each thing to stay away from that is clear, minus 5 for one not found, minus 25 for something to avoid that is near, minus 4 per bedroom above the number asked for). Then `explain_picks`: the model writes `dailyLife` (how their day would go, as an assumption) and, for each pick, why it suits them and the trade-off. Anything in a rationale containing a number that is not in the result is dropped, so the model reasons but does not state facts of its own; its closing headline is cut to two sentences.

*Facts, not the model:* the browser gets steps, then one `result` built on the server from the database, the map data and Vexcel. The model's tokens are never streamed as facts. `DucktectResult` is the server's own type (`lib/agent/ducktect.ts`).

*Read-only, pinned by tests.* The six tools are `get_user_context`, `interpret_wish`, `scout_areas`, `confirm_with_satellite`, `rank_candidates`, `explain_picks`; none of the flock agent's write tools are given to it, and a model that asks for `update_shortlist` gets "no such tool". "Add to flock picks" is the person's own tap (a toggle: tap again to undo) on the normal vote path. One deliberate exception: a live Vexcel answer is saved to `aerial_queries` / `listing_enrichment` through the service role, because it is a cache of public imagery results, not user data.

*Where "what is around" comes from.* `places` (`0017_places.sql`, `scripts/ingest-places.ts`): every named shop, amenity, leisure, tourism, craft and healthcare place plus park-like areas with outlines, from OpenStreetMap (© OpenStreetMap contributors, ODbL, credited in the panel), loaded once into the local database with a searchable text of each place's name and tags (full-text prefix search, so "climb" finds "climbing"). Nothing is fetched at request time. This replaced an attempt to use Vexcel for parks: probed on known parks (Nov 2026), its embedding scores for "park" overlapped completely between parks and dense blocks, and its detector never found a "park", so imagery is used only to confirm what it can show. The map data is incomplete and a word can match more than it means, so a result names what matched and its kind, and "none" is worded "on the map data".

*It always answers.* With no `OPENAI_API_KEY`, a model that fails, or one that never ranks, the same pipeline runs on a keyword reading of the wish (`ruleSplit`; it reads what was typed, not the person, and writes no rationale) and says so (`viaModel: false`). The model has capped retries (one), a 60 s timeout and low reasoning effort, and the agent a 75 s wall clock.

*Degraded modes* (wording in `ducktect-notes.ts`, tested): map data unavailable, satellite unavailable or partial, an unverified label, nothing to look around for or confirm (ranked on listing data), nothing matched (names the constraint and what dropping it would give: "Dropping 'under $1,000' would give 12 places"), and a model-free answer. The panel also states its limits ("Looked around 127 places that fit, then confirmed the best 12 from above") and shows how the day was read ("How I read your day"), so a wrong assumption can be corrected.

*Area precedence without a geocoder.* The kit has no neighborhoods, so a named area (the ten in `LA_AREAS`) is a box around an approximate centre; it overrides the map viewport and the map moves there. With none named, the viewport is the area. Each pick shows the named neighborhood it sits in, when it is in one.

*Not built:* ortho thumbnails on the card, a geocoder or neighborhood polygons, routes (the "reach" is straight-line distance, not a route), and any use of other flock members' private details.

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
| `POST /api/agent/feedback` | `{ flockId, listingId, reasons }` after a thumbs-down, or `{ flockId }` alone for a membership change. Runs `rerunShortlist` (no model call, no key needed, outside the agent's daily budget) and answers `{ savedIds, ruledOutBy, outcome, added, removed }`. Joining a flock triggers the same refresh |
| `POST /api/proposals/[id]/respond` | Accept or decline an agent-proposed group; creates the flock when all accept |
| `POST /api/ducktect` | Read-only agent for the search bar's "Ducktect best option"; streams steps, returns ranked picks |
| `POST /api/flocks` | Create flock (friends/open) with validation. The creator is an active admin in the same transaction, whether or not anyone else has accepted yet |
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
- Secrets: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VEXCEL_API_KEY`, `COSTAR_ZIP_PASSWORD` are server/script only. Existing public vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID`.
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

**Where we are (as of this branch):** T1 schema, seed and RLS files written and run on a local Postgres, not diffed against a real dump; T2 done; T3 done locally; T4 code done and used locally, real-project cutover not done; T5 galleries done from the kit, Apartments.com scraper optional and unrun; T6 flocks and `join_flock`; T7 matching library (`lib/match`, not yet used by the flock score); T8 thumbs voting, flock score and the removal rule with live updates; T12 agent core (`lib/agent`, `/api/agent`), whose acceptance flow passed on `openai:gpt-5-mini`; there is no UI for it (the Ask Flock sheet was removed), and the routes need sign-in (T9). Everything marked done was tested against a **local** Supabase (`docs/LOCAL_DATABASE.md`), not your real project.

| Phase | Work | Done when |
|---|---|---|
| **0 Foundation** | Export schema and seed to `supabase/migrations/`; confirm and enable RLS; `.gitignore` for `data/` and `.cache/`; rename to Flock; env vars; clear the Brooklyn seed rows (swipes, stash, tours, messages) when the real listings land | A teammate can recreate the DB from the repo |
| **1 Real listings** | **Read the kit docs; `ingest-costar.ts`; `listings` view; switch the map center and seed group to LA** | Map and swipe deck show real LA floor plans |
| 2 Image enrichment | Permission note; `enrich-apartments-com.ts` for the demo properties first; gallery in `ListingReel`; photo credit | Demo listings have several photos, and the app looks fine without them |
| **3 Flocks and matching** | `flocks`/`flock_members` migration; `swipes.flock_id` and thumbs votes; `proposals`; `join_flock`; Friends/Open creation; `compat`, `listing-fit`; seeded fictional profiles for the demo | Create a flock, join an open one by rules, see why a place fits |
| **4 Deep Agent** (T12, T13 built) | Smoke test `deepagents` + model; orchestrator and `roommate-matcher` / `apartment-searcher` subagents; `update_shortlist`, `send_invites` (interrupt), `process_feedback`, `agent_runs` | "We need 3 bedrooms under $4,700" yields a roommate proposal and a saved, explained shortlist |
| **5 Vexcel + Ducktect** | `lib/enrich/vexcel.ts`, `aerial_queries`, `aerial-evidence` subagent, pre-warm script; "Ducktect best option" in `MapSearch`; `/api/ducktect`; result sheet and map restyle | Typing a prose wish and picking Ducktect returns ranked picks with aerial evidence |
| 6 Auth | Supabase Auth screens, `proxy.ts`, remove hard-coded ids, demo switcher behind a flag | Real sign-in works; two phones still demo |
| 7 Optional | Rent split by room; tour slots; comparison polish; LangSmith traces; Deep Agents memory | Only if time remains |

**Minimum demo (if time is tight):** phases 0, 1, 3 (seeded profiles), 4 and 5. Everything else is polish.

---

## 14. Two-minute demo

1. **0:00** The problem: you need compatible people *and* an apartment that fits all of them.
2. **0:20** Sign in, open Your Flocks; create an Open flock with a short, wordy profile and join rules.
3. **0:45** (agent entry point to be decided) "Three of us, $4,700 combined, three bedrooms." The Deep Agent's roommate-matcher proposes a group; the user approves the invites and the flock accepts.
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
| `OPENAI_API_KEY` (read by `@langchain/openai`), `AGENT_DAILY_LIMIT` (optional) | server | Deep Agent |
| `COSTAR_KIT_ZIP` or `COSTAR_KIT_URL`, `COSTAR_ZIP_PASSWORD` | scripts | kit ingestion |
| `APARTMENTS_COM_ENRICH` (`on`/`off`) | scripts | image enrichment kill switch |
| `VEXCEL_API_KEY` | server/scripts | aerial evidence and Ducktect |
| LangSmith variables (optional) | server | agent traces **[verify]** |
| `NEXT_PUBLIC_DEMO` | browser | shows the user switcher |
