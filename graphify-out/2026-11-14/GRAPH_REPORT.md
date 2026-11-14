# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 114 files · ~59,457 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 712 nodes · 1784 edges · 27 communities (24 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2f9d75a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Account & Compare Pages
- api.ts
- picks/page.tsx
- Package Dependencies & Lint
- SessionGate.tsx
- Product Concept & Agents
- Compare Preferences
- CoStar Data Ingest
- find/page.tsx
- listing-fit.ts
- TypeScript Config
- Map Data Model
- Supabase Security & Schema
- ingest-costar-media.ts
- Listing Cards Schema
- Icon Components
- Agent Rules Docs
- enrich-apartments-com.ts
- Flock — End-Goal Design & Implementation Guide
- Local test database
- media.ts
- Apartments.com enrichment: permission record
- AGENTS.md
- ListingReel.tsx
- invite/page.tsx
- map/page.tsx
- EndOfDeck.tsx

## God Nodes (most connected - your core abstractions)
1. `react` - 41 edges
2. `next` - 36 edges
3. `check()` - 30 edges
4. `money()` - 28 edges
5. `getGroupMembers()` - 25 edges
6. `area()` - 25 edges
7. `Avatar()` - 24 edges
8. `ListingPhoto()` - 21 edges
9. `Button()` - 21 edges
10. `GroupListing` - 18 edges

## Surprising Connections (you probably didn't know these)
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `11. Realtime` --references--> `subscribeToGroupSwipes()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts
- `3.1 Gaps between today and the goal` --references--> `subscribeToGroupSwipes()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (27 total, 3 thin omitted)

### Community 0 - "Account & Compare Pages"
Cohesion: 0.05
Nodes (93): AccountPage(), Section(), Stats, ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs() (+85 more)

### Community 1 - "api.ts"
Cohesion: 0.18
Nodes (19): MessageSheet(), Thread(), send(), cancelTour(), changed(), check(), decorate(), FeedPost (+11 more)

### Community 2 - "picks/page.tsx"
Cohesion: 0.16
Nodes (19): toggleStash(), badge(), FlockPicksPage(), toggleStash(), Pick, Sort, toPicks(), toggleStash() (+11 more)

### Community 3 - "Package Dependencies & Lint"
Cohesion: 0.07
Nodes (37): eslintConfig, dependencies, framer-motion@^14.14.0, lucide-react@^1.72.0, next@16.4.6, react@19.3.0, react-dom@19.3.0, @supabase/ssr@^0.12.7 (+29 more)

### Community 4 - "SessionGate.tsx"
Cohesion: 0.16
Nodes (16): gaegu, metadata, RootLayout(), viewport, BottomNav(), TABS, MotionProvider(), AUTH_PAGES (+8 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "Compare Preferences"
Cohesion: 0.12
Nodes (22): WeightsEditor(), evenWeights(), flockScore(), MetricKey, METRICS, metricValue(), normalized(), removalAt() (+14 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "find/page.tsx"
Cohesion: 0.08
Nodes (53): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save(), FindFlockPage() (+45 more)

### Community 9 - "listing-fit.ts"
Cohesion: 0.06
Nodes (47): FlockRow, GET(), matchPct(), person(), ProfileRow, POST(), POST(), 7.1 Units and the feasibility rule (settled) (+39 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 11 - "Map Data Model"
Cohesion: 0.24
Nodes (13): clean(), CommunityRow, isLosAngeles(), KitFloorPlan, KitRecord, ListingRow, Mapped, mapRecord() (+5 more)

### Community 12 - "Supabase Security & Schema"
Cohesion: 0.20
Nodes (5): Row-level security policies, dev-open-access.sql demo file, Supabase schema and migrations, env, PRIVATE

### Community 13 - "ingest-costar-media.ts"
Cohesion: 0.14
Nodes (12): APARTMENT_FILE, apartmentFile(), extractKit(), KitLine, readJsonl(), args, db, flag() (+4 more)

### Community 14 - "Listing Cards Schema"
Cohesion: 0.40
Nodes (4): communities table, listings table (one row per floor plan), Brooklyn-to-LA cutover (ticket T4), listing_cards view (migration 0005)

### Community 17 - "enrich-apartments-com.ts"
Cohesion: 0.05
Nodes (34): asArray(), httpsUrl(), imageUrls(), isBlocked(), isObj(), Json, jsonLdNodes(), MediaItem (+26 more)

### Community 18 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.05
Nodes (35): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 2.1 What a user does (+27 more)

### Community 19 - "Local test database"
Cohesion: 0.20
Nodes (9): Check row-level security, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop, Test the flock functions (+1 more)

### Community 20 - "media.ts"
Cohesion: 0.39
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "ListingReel.tsx"
Cohesion: 0.20
Nodes (16): dist(), MapListingPage(), Icon(), IconName, ICONS, Action(), CardHandle, Direction (+8 more)

### Community 24 - "invite/page.tsx"
Cohesion: 0.52
Nodes (5): InvitePage(), FLOCK_NAME, GROUP_ID, inviteFriends(), inviteLink()

### Community 25 - "map/page.tsx"
Cohesion: 0.11
Nodes (28): CENTER, CHIPS, LatLng, LocateButton(), MapPage(), Ducktective(), LOOP, applyFilters() (+20 more)

### Community 26 - "EndOfDeck.tsx"
Cohesion: 0.48
Nodes (5): ForYouPage(), Direction, EndOfDeck(), Pile(), getMySwipes()

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 236 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `enrich-apartments-com.ts` to `Package Dependencies & Lint`, `CoStar Data Ingest`, `find/page.tsx`, `listing-fit.ts`, `ingest-costar-media.ts`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Account & Compare Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.054139753376394595 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Account & Compare Pages` to `api.ts`, `picks/page.tsx`, `Package Dependencies & Lint`, `SessionGate.tsx`, `find/page.tsx`, `ListingReel.tsx`, `invite/page.tsx`, `map/page.tsx`, `EndOfDeck.tsx`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `Package Dependencies & Lint` be split into smaller, more focused modules?**
  _Cohesion score 0.06747638326585695 - nodes in this community are weakly interconnected._
- **Why does `Ducktect best option` connect `Product Concept & Agents` to `map/page.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Product Concept & Agents` be split into smaller, more focused modules?**
  _Cohesion score 0.06306306306306306 - nodes in this community are weakly interconnected._