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

---

## 3. Current state (read from the code)

**Stack:** Next.js 16.4.6 (App Router, `cacheComponents: true`, `partialPrefetching: true`), React 19, Tailwind 4, Supabase (`@supabase/supabase-js`), Google Maps (`@vis.gl/react-google-maps`), framer-motion. Font Gaegu.

**Shape:** a client-rendered app. Every screen is a `'use client'` page that calls `lib/api.ts`, which calls Supabase directly from the browser with the anon key. `lib/api.ts` states the rule "UI code should import from this file only."

| Route | Screen |
|---|---|
| `/` | Flock Picks (group feed, live via Supabase realtime) |
| `/reels` | For You swipe deck (`ListingReel`) |
| `/map`, `/map/[id]` | Map + listing |
| `/tours` | Calendar and tours |
| `/group` | Flock: members, rankings, preferences |
| `/compare`, `/compare/pick` | Compare with weighted score |
| `/account` | Account |

**Tables the code uses** (inferred; there is **no schema or seed file in the repo**): `profiles`, `group_members(role)`, a group table keyed by `GROUP_ID`, `group_likes` (listing_id, likes, liked_by[]), `swipes(user_id, listing_id, direction)`, `stash`, `listings(id,address,neighborhood,price,beds,baths,sqft,pets,lat,lng,photos[])`, `tours`, `tour_attendees`, `messages`.

**Scoring today:** `groupMatch()` in `lib/api.ts` (4 checks: price vs average budget, beds, pets, neighborhood) and `flockScore()` in `lib/compare.ts` (`70 × share of flock that liked + 0.3 × match %`, from the Figma dev note). Pure functions, tested with `node --test` in `lib/compare.test.ts`.

### 3.1 Gaps between today and the goal

| Gap | Where | Why it matters |
|---|---|---|
| Hard-coded single group and user | `GROUP_ID`, `CURRENT_USER_ID` (localStorage), `UserSwitcher` | Needs real accounts and many flocks |
| No auth, and RLS status unknown | anon key in the browser | **Verify RLS immediately.** With the anon key and no RLS, anyone can read or write every row |
| Schema and seed not in the repo | Supabase dashboard only | Teammates can't reproduce the DB. Export to `supabase/migrations/` first |
| Data is a Brooklyn seed | `GROUP_NAME = 'Brooklyn Flock'`, map `CENTER` in NYC | CoStar's kit covers Los Angeles and Houston; demo city becomes LA |
| `budget_max` is ambiguous | `groupMatch` compares total `price` to the *average* of members' `budget_max` | Must define it as each person's maximum rent **share** (see §7.1) |
| `subscribeToGroupSwipes` listens to every swipe in the table | `lib/api.ts` | Filter by flock, or one channel per flock |
| `getSwipeDeck` builds a long `not.in (...)` URL | `lib/api.ts` | Breaks past a few hundred swipes; move to a SQL view/RPC |
| Metadata still says "aptHunt" | `app/layout.tsx` | Rename to Flock |
| No server code | no `app/api/**`, no `proxy.ts` | Agent and ingestion need a server |

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
      scripts/ingest-costar.ts → communities, floor_plans
      scripts/enrich-apartments-com.ts → listing_media
      scripts/enrich-vexcel.ts (pre-warm common phrases) → aerial_queries, listing_enrichment
```

**Rules of the road**

- Browser code keeps using `lib/api.ts`. Anything that needs a secret (Anthropic, Vexcel, service-role key) goes through a Route Handler. Secrets are never `NEXT_PUBLIC_*`.
- Heavy or rate-limited work (kit ingestion, image enrichment) is an **offline script**, not a request-time call. The app only reads the results from Supabase.
- Pure logic (`lib/match`, `lib/compare.ts`) has no I/O and is unit-tested.
- The Deep Agent runs in a **Node** Route Handler on a long-lived server (`next start` or a container) rather than a short-lived serverless function; see §8.6.
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

```sql
-- One row per apartment community (CoStar property).
create table communities (
  id uuid primary key default gen_random_uuid(),
  costar_property_id text unique not null,   -- [verify] exact id field in the kit
  name text, address text, city text, postal_code text,
  lat double precision, lng double precision,
  neighborhood text,                         -- derived (see §6.1)
  management_company text,
  primary_photo_url text,
  source_type int,                           -- Residential Listings enum, see §6.1
  raw jsonb,                                 -- original record, for debugging
  ingested_at timestamptz default now()
);

-- One row per floor plan at a community. This is what a roommate group actually rents.
create table floor_plans (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities on delete cascade,
  costar_floorplan_id text,                  -- [verify]
  beds int not null, baths numeric not null, sqft int,
  rent_min int, rent_max int,                -- floor-plan rent range from the kit
  raw jsonb,
  unique (community_id, costar_floorplan_id)
);

-- The UI keeps reading "listings". Same columns as today, now backed by real data.
create view listings as
select fp.id, c.address, c.neighborhood,
       coalesce(fp.rent_min, fp.rent_max) as price,   -- asking rent; show range where min ≠ max
       fp.beds, fp.baths, fp.sqft,
       null::boolean as pets,                          -- [verify] pet policy field; else null = unknown
       c.lat, c.lng,
       coalesce(m.photos, array[c.primary_photo_url]) as photos
from floor_plans fp
join communities c on c.id = fp.community_id
left join (select community_id, array_agg(url order by position) photos
           from listing_media group by community_id) m on m.community_id = c.id;
```

`pets` becoming nullable means `groupMatch` must treat "unknown" as unknown, not as "no" (today it is typed `boolean`).

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

```sql
alter table profiles
  add column if not exists budget_max int,            -- max monthly rent SHARE this person accepts
  add column if not exists about text,                -- "About you" (open flocks)
  add column if not exists habits jsonb default '{}', -- sleep schedule, cleanliness, guests, smoking, noise
  add column if not exists dealbreakers text[] default '{}';

create table flocks (                                  -- today's single "group", generalized
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text check (kind in ('friends','open')) not null,
  origin text check (origin in ('invited','open','agent_proposed')) default 'invited',
  about text, looking_for text,                        -- open-flock prose
  open_to_join boolean default false,
  join_rules jsonb default '{}',                       -- {budget:true, beds_movein:true, areas:true}
  spots_total int, bedrooms_needed int,
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

-- Replaces direct use of swipes for group decisions; swipes stay for the For You deck.
create table shortlist (
  flock_id uuid references flocks on delete cascade,
  floor_plan_id uuid references floor_plans,
  score int not null,                      -- computed by lib/match, never by the model
  explanation text, criteria jsonb,        -- per-criterion result the explanation is built from
  added_by text check (added_by in ('agent','member')) default 'agent',
  agent_run_id uuid, created_at timestamptz default now(),
  primary key (flock_id, floor_plan_id)
);

create table listing_comments (flock_id uuid, user_id uuid, floor_plan_id uuid, body text, created_at timestamptz default now());

create table flock_feedback (            -- rejections and reasons the agent learns from (§8.7)
  flock_id uuid references flocks on delete cascade, user_id uuid references profiles,
  floor_plan_id uuid references floor_plans, reason text, created_at timestamptz default now()
);

create table agent_runs (                  -- audit trail: what the agent did and why
  id uuid primary key default gen_random_uuid(),
  flock_id uuid references flocks, user_id uuid references profiles,
  request text, steps jsonb, result_summary text, created_at timestamptz default now()
);
```

Existing mapping: `group_members` → `flock_members`; the hard-coded `GROUP_ID` → a `flockId` from the route or session; `group_likes` becomes a view over `swipes` joined to active `flock_members`; `swipes`, `stash`, `tours`, `tour_attendees`, `messages` keep their shape but gain `flock_id` where they are group-scoped.

### 5.4 Row-level security (sketch)

Every table is RLS-on. Core pattern: a user can see a flock's rows only if they are an **active** member.

```sql
create policy "members read their flocks" on flocks for select
  using (exists (select 1 from flock_members m
                 where m.flock_id = flocks.id and m.user_id = auth.uid() and m.status = 'active'));
-- Open flocks expose a public profile through a view (name, about, looking_for, rules, spots),
-- never the member list or private profile fields.
```

---

## 6. Data sources

### 6.1 CoStar data kit — primary source **[planned]**

**What we know** (from the track guide and the kit docs we were given):

- Kit is a zip (about 160 MB) behind a download link and a zip password. Both come from the CoStar keys card; run `/costar-keys` in the track Discord. **Never commit the zip, the password, or extracted data**; add `data/` and `.cache/` to `.gitignore`.
- Contents include `data/apartment-listing.jsonl` (1,747 apartment listing records across Los Angeles and Houston), `models/apartment-listing.md`, `schemas/apartment-listing.schema.json`, `schemas/openapi.yaml`.
- Records are organized around **communities and floor plans**, not individual units. Useful fields: property/community ids, min and max rent, floor-plan rents, beds, baths, coordinates, primary photo, management company.
- **Residential Listings** carry `source.sourceType`, an integer enum: `0 None, 1 Mls, 2 Multifamily, 3 Land, 4 NewHomes`. For an apartment product, `2 = Multifamily` is the one we want. **[verify]** that this is the field we filter on, and whether any `Mls` or `NewHomes` rows are rentals.
- Not in the kit: interior galleries, personal agent contact info. Availability and public photo-display rights still need confirmation.

**[verify] before coding the mapping:** read `models/apartment-listing.md` and the JSON schema, then fill the "source field" column below. We have not seen the real field names.

| Our column | Source field | Notes |
|---|---|---|
| `communities.costar_property_id` | [verify] | Primary key for joins and dedupe |
| `communities.name / address / city / postal_code` | [verify] | |
| `communities.lat / lng` | [verify] | Needed for the map and for Vexcel; count how many rows lack it |
| `communities.primary_photo_url` | [verify] | May be hotlink-restricted; test from the browser |
| `communities.management_company` | [verify] | |
| `communities.neighborhood` | derived | Kit may not have it. Derive from ZIP or a point-in-polygon on LA neighborhood boundaries; Google reverse geocoding is a fallback (we already have a Maps key) |
| `floor_plans.beds / baths / sqft` | [verify] | |
| `floor_plans.rent_min / rent_max` | [verify] | Floor-plan rents; never present a range as one fixed price |
| pet policy, amenities | [verify] | If absent, leave null and say "unknown" in the UI |

**Ingest script (`scripts/ingest-costar.ts`)**

1. Read `COSTAR_KIT_ZIP` (local path) or download `COSTAR_KIT_URL`; unzip with `COSTAR_ZIP_PASSWORD` into `data/` (not committed).
2. Stream `apartment-listing.jsonl` line by line. Validate each record against `schemas/apartment-listing.schema.json` (Ajv); count and log rejects instead of failing.
3. Filter: Los Angeles (by city/bbox) and `sourceType == Multifamily`. Print counts at each filter so we can see what we kept.
4. Group by community; upsert `communities`, then `floor_plans` (idempotent on the CoStar ids).
5. Print a report: records read, rejected, with coordinates, with a photo, with a rent, floor plans per community. This is also the "how many LA rows have usable coordinates" answer for the mentors.

**Search over the data**: `search_apartments` (agent tool) and the map/deck queries hit `floor_plans` + `communities` in SQL: rent range vs combined budget, beds, area, and a bbox for the map viewport.

**Honest labeling**: the kit may be a snapshot. Show "Rent from kit · availability not confirmed" wherever availability matters; do not call anything "available now."

### 6.2 Apartments.com images and details — enrichment **[planned]**

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

### 7.1 Define the units once

- `profiles.budget_max` = the most this person will pay **per month as their share**.
- Rent split is **equal** by default (listing rent ÷ number of roommates), with an option to split by bedroom size later.
- A flock's **combined budget** = sum of members' `budget_max`. The guide's example: $1,500 + $1,800 + $1,400 = $4,700.
- **Hard constraints** filter first; **soft preferences** then rank.

### 7.2 Listing fit (hard constraints, then score)

Hard (a listing fails if any are false): `rent ≤ combined budget`; `beds ≥ people needing their own room` (a 2-bd for 3 people fails unless the flock explicitly accepts shared rooms); every member's own `budget_max ≥` their share; pets allowed if anyone needs it (unknown pets = warn, not fail); inside accepted areas.

Soft, each scored 0–1 with a recorded reason: affordability margin, neighborhood match, move-in timing, extra amenities from kit/enrichment, `$ / sqft`. Output:

```ts
type Fit = { passes: boolean; score: number; criteria: { key: string; ok: boolean | null; detail: string }[] };
```

`ok: null` means unknown (missing data). The UI shows criteria as a checklist, and the agent's explanation is written from this structure, so it can't invent reasons.

### 7.3 Flock score (keep what exists)

`flockScore = round(70 × (likes / groupSize) + 0.3 × fit%)` per the Figma dev note, in `lib/compare.ts`. Per-user custom weights in Compare stay as designed. The score shown on a shortlist item is `shortlist.score`, computed server-side with the same function.

### 7.4 Roommate compatibility and open-flock joining

`compat(person, flock)` returns pass/fail per rule the owner switched on in 00h: budget overlap, bedrooms + move-in within 30 days, at least one shared area, and no clash with dealbreakers. Habit fields (sleep, cleanliness, guests, smoking, noise) feed a soft similarity score for ranking candidates.

**Consent decision (needs the team's sign-off).** The track guide says every person must accept before a group forms. Our Open flock design lets compatible people join instantly. Proposed reconciliation: *the owner's rules are standing consent from existing members* (shown to them when they join the flock), joiners see only the public profile before joining, and full profiles are shared after. Any member can remove someone. Agent-proposed groups always require an explicit accept from every person.

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
| `search_profiles`, `score_compat`, `propose_group` | roommate-matcher | Candidates, per-rule compatibility, **proposals only** | `lib/match/compat.ts` |
| `search_apartments`, `rank_apartments`, `get_listing_media` | apartment-searcher | SQL filter on floor plans, hard-constraints-then-score, photos | `lib/match/listing-fit.ts`, `listing_media` |
| `aerial_search`, `property_attributes` | aerial-evidence | Vexcel semantic search / attributes with cache and budget | `lib/enrich/vexcel.ts`, `aerial_queries` |
| `update_shortlist` | orchestrator | **Write** picks + explanations to `shortlist` | Supabase |
| `send_invites` | orchestrator | **Write**; interrupts for approval | Supabase |
| `process_feedback` | orchestrator | Record a rejection or changed preference, re-search, update the shortlist | `flock_feedback` + the above |

### 8.4 Safety rules

- `userId` and `flockId` come from `runtime.context`, never from model arguments.
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
  const { flockId, message, threadId } = await req.json();
  await assertActiveMember(user.id, flockId);

  const stream = await flockAgent.stream(
    { messages: [{ role: 'user', content: message }] },
    { streamMode: ['updates', 'messages'], context: { userId: user.id, flockId }, configurable: { thread_id: threadId } },
  );
  // Forward each [mode, data] chunk as one NDJSON line: todos, subagent steps, tokens, __interrupt__.
  return new Response(toNdjson(stream), { headers: { 'Content-Type': 'application/x-ndjson' } });
}
```

An approval resumes the same thread: `POST /api/agent/resume` calls `flockAgent.invoke(new Command({ resume: { decisions } }), { configurable: { thread_id } })` (`Command` from `@langchain/langgraph`), one decision per pending action, in order.

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
- A rejection (thumbs-down on a pick or "too far") calls `process_feedback`; the shortlist updates live through realtime (§11).

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
| `POST /api/ducktect` | Read-only agent for the search bar's "Ducktect best option"; streams steps, returns ranked picks |
| `POST /api/flocks` | Create flock (friends/open) with validation |
| `POST /api/flocks/[id]/join` | Check open-flock rules, then join or create a request |
| `POST /api/flocks/[id]/invites` | Invite by username/email |
| `GET /api/flocks/discover` | Open flocks ranked by compatibility with the caller |
| Reads/writes for swipes, stash, tours, votes | Stay in `lib/api.ts` over Supabase under RLS |

Tours: the kit has no agent contact data, so the "open tour dates from the agent" in the Book Tour sheet are **simulated slots** (a `tour_slots` table seeded per demo listing) and must be labeled as sample data until we have a real source.

---

## 10. Auth, consent, security

- Supabase Auth (email + password, matching 00b/00c). Replace `CURRENT_USER_ID` with the session user; keep `UserSwitcher` only behind `NEXT_PUBLIC_DEMO=1` so two phones can act as two seeded people.
- `proxy.ts`: redirect signed-out users to `/signin` (optimistic only).
- RLS on every table (§5.4). Service-role key only in server code and scripts.
- Secrets: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VEXCEL_API_KEY`, `COSTAR_ZIP_PASSWORD` are server/script only. Existing public vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID`.
- Treat profile prose and scraped page text as untrusted input: never put it in a position where it can act as instructions to the agent (pass as quoted data), and never render scraped HTML.

---

## 11. Realtime

Existing pattern (`subscribeToMessages`, `subscribeToGroupSwipes`) is right. Extend to `shortlist` and `listing_comments`, one channel per flock, filtered by `flock_id` (fixes the unfiltered swipes subscription, §3.1). Debounce refetches as `app/page.tsx` already does.

---

## 12. Testing

- Keep `node --test` for pure code. Add tests for: `compat`, `listing-fit` (hard constraints, unknown handling), `rent-split`, kit mapping (`lib/costar/map.ts`), and `apartments-com.parse()` against saved fixtures.
- Ingestion has a built-in check: the report counts (§6.1). Eyeball 10 random rows against the raw record.
- Agent: a small fixture set (three profiles, ten floor plans, expected top pick and expected exclusions); assert that `update_shortlist` is called and that no rent/score appears in the answer that isn't in a tool result.
- Ducktect: fixtures for the prose splitter (hard / visual / not-checkable) on 10 sample queries; Vexcel mocked with canned responses; assert the Ducktect agent has no write tools; assert the degraded modes (Vexcel down, no visual phrases, no results).
- Deep Agents smoke test: one `createDeepAgent` call with one tool, a subagent and `contextSchema` on the chosen model, before building on it.
- Manual: two phones as two members, one rejects a pick, the other's shortlist updates.

---

## 13. Roadmap

Order is by what the demo needs; the demo path is bold.

| Phase | Work | Done when |
|---|---|---|
| **0 Foundation** | Export schema and seed to `supabase/migrations/`; confirm and enable RLS; `.gitignore` for `data/` and `.cache/`; rename to Flock; env vars | A teammate can recreate the DB from the repo |
| **1 Real listings** | **Read the kit docs; `ingest-costar.ts`; `listings` view; switch the map center and seed group to LA** | Map and swipe deck show real LA floor plans |
| 2 Image enrichment | Permission note; `enrich-apartments-com.ts` for the demo properties first; gallery in `ListingReel`; photo credit | Demo listings have several photos, and the app looks fine without them |
| **3 Flocks and matching** | `flocks`/`flock_members` migration; Friends/Open creation; `compat`, `listing-fit`; seeded fictional profiles for the demo | Create a flock, join an open one by rules, see why a place fits |
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
5. **Photos: hotlink or copy to Supabase Storage** (§6.2). Copy is more reliable for the demo.
6. **Agent hosting.** A long-lived Node server for the demo (§8.6), or add a durable checkpointer.
7. **Ducktect label and placement.** "Ducktect best option" is spelled as written by the team; confirm, then add the dropdown state and result sheet to Figma.

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
