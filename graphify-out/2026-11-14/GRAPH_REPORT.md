# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 114 files · ~59,431 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 712 nodes · 1784 edges · 28 communities (24 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2f9d75a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Account & Compare Pages
- Listing & Picks Flow
- App Shell & Styling
- Package Dependencies & Lint
- test-votes.mjs
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
- test-flocks.mjs
- Flock — End-Goal Design & Implementation Guide
- Local test database
- media.ts
- Apartments.com enrichment: permission record
- AGENTS.md
- ref_node_child_process
- enrich-apartments-com.ts
- map/page.tsx
- Flock
- apartments-com.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 41 edges
2. `next` - 36 edges
3. `check()` - 30 edges
4. `money()` - 28 edges
5. `getGroupMembers()` - 25 edges
6. `area()` - 25 edges
7. `Avatar()` - 24 edges
8. `ListingPhoto()` - 21 edges
9. `Button()` - 19 edges
10. `GroupListing` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Voting and the flock score (ticket T8)` --references--> `flockScore()`  [INFERRED]
  README.md → lib/compare.ts
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `11. Realtime` --references--> `subscribeToGroupSwipes()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (28 total, 4 thin omitted)

### Community 0 - "Account & Compare Pages"
Cohesion: 0.07
Nodes (83): AccountPage(), Section(), Stats, ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs() (+75 more)

### Community 1 - "Listing & Picks Flow"
Cohesion: 0.09
Nodes (42): AGENTS, busyMembers(), openSlots(), SLOTS, Slots(), add(), MessageSheet(), Thread() (+34 more)

### Community 2 - "App Shell & Styling"
Cohesion: 0.07
Nodes (47): gaegu, metadata, RootLayout(), viewport, toggleStash(), dist(), MapListingPage(), badge() (+39 more)

### Community 3 - "Package Dependencies & Lint"
Cohesion: 0.07
Nodes (37): eslintConfig, dependencies, framer-motion@^14.14.0, lucide-react@^1.72.0, next@16.4.6, react@19.3.0, react-dom@19.3.0, @supabase/ssr@^0.12.7 (+29 more)

### Community 4 - "test-votes.mjs"
Cohesion: 0.18
Nodes (6): admin, anon, opts, people, st, tag

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "Compare Preferences"
Cohesion: 0.23
Nodes (13): WeightsEditor(), evenWeights(), flockScore(), MetricKey, METRICS, metricValue(), normalized(), removalAt() (+5 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "find/page.tsx"
Cohesion: 0.06
Nodes (54): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save(), FindFlockPage() (+46 more)

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
Cohesion: 0.15
Nodes (12): APARTMENT_FILE, apartmentFile(), extractKit(), KitLine, readJsonl(), args, db, flag() (+4 more)

### Community 14 - "Listing Cards Schema"
Cohesion: 0.40
Nodes (4): communities table, listings table (one row per floor plan), Brooklyn-to-LA cutover (ticket T4), listing_cards view (migration 0005)

### Community 17 - "test-flocks.mjs"
Cohesion: 0.14
Nodes (9): @supabase/supabase-js@^2.119.0, @supabase/supabase-js, admin, anon, flocks, opts, people, st (+1 more)

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

### Community 24 - "enrich-apartments-com.ts"
Cohesion: 0.17
Nodes (8): Parsed, args, db, flag(), opt(), overrides, Result, results

### Community 25 - "map/page.tsx"
Cohesion: 0.11
Nodes (28): CENTER, CHIPS, LatLng, LocateButton(), MapPage(), Ducktective(), LOOP, applyFilters() (+20 more)

### Community 28 - "Flock"
Cohesion: 0.20
Nodes (9): CoStar listings (ticket T3), Database, Deploy on Vercel, Flock, Flocks (ticket T6), Galleries (ticket T5), Getting Started, Learn More (+1 more)

### Community 29 - "apartments-com.ts"
Cohesion: 0.31
Nodes (9): asArray(), httpsUrl(), imageUrls(), isBlocked(), isObj(), Json, jsonLdNodes(), MediaItem (+1 more)

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 236 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-flocks.mjs` to `Package Dependencies & Lint`, `test-votes.mjs`, `CoStar Data Ingest`, `find/page.tsx`, `listing-fit.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Account & Compare Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.0652210175145955 - nodes in this community are weakly interconnected._
- **Why does `react` connect `find/page.tsx` to `Account & Compare Pages`, `Listing & Picks Flow`, `App Shell & Styling`, `Package Dependencies & Lint`, `map/page.tsx`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `Listing & Picks Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.08979591836734693 - nodes in this community are weakly interconnected._
- **Why does `Ducktect best option` connect `Product Concept & Agents` to `map/page.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `App Shell & Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.06766917293233082 - nodes in this community are weakly interconnected._