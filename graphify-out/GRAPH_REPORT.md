# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- Corpus is ~37,825 words - fits in a single context window. You may not need a graph.

## Summary
- 420 nodes · 1118 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Account & Compare Pages
- Listing & Picks Flow
- App Shell & Styling
- Package Dependencies & Lint
- Map Search
- Product Concept & Agents
- Compare Preferences
- CoStar Data Ingest
- Route Layouts
- Tours & Booking
- TypeScript Config
- Map Data Model
- Supabase Security & Schema
- Apartment Kit Extraction
- Listing Cards Schema
- Icon Components
- Agent Rules Docs

## God Nodes (most connected - your core abstractions)
1. `react` - 30 edges
2. `money()` - 28 edges
3. `check()` - 26 edges
4. `area()` - 25 edges
5. `getGroupMembers()` - 23 edges
6. `next` - 23 edges
7. `ListingPhoto()` - 21 edges
8. `Avatar()` - 18 edges
9. `Icon()` - 18 edges
10. `GroupListing` - 18 edges

## Surprising Connections (you probably didn't know these)
- `AccountPage()` --calls--> `Icon()`  [EXTRACTED]
  app/account/page.tsx → components/Icon.tsx
- `AccountPage()` --calls--> `PreferencesSheet()`  [EXTRACTED]
  app/account/page.tsx → components/PreferencesSheet.tsx
- `AccountPage()` --calls--> `getStash()`  [EXTRACTED]
  app/account/page.tsx → lib/api.ts
- `AccountPage()` --calls--> `area()`  [EXTRACTED]
  app/account/page.tsx → lib/format.ts
- `ComparePage()` --calls--> `Icon()`  [EXTRACTED]
  app/compare/page.tsx → components/Icon.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (17 total, 2 thin omitted)

### Community 0 - "Account & Compare Pages"
Cohesion: 0.10
Nodes (42): AccountPage(), Section(), Stats, ComparePickPage(), Source, SOURCES, GroupPage(), SectionHeader() (+34 more)

### Community 1 - "Listing & Picks Flow"
Cohesion: 0.12
Nodes (37): ListingDetailPage(), toggleStash(), badge(), FlockPicksPage(), toggleStash(), Pick, Sort, toPicks() (+29 more)

### Community 2 - "App Shell & Styling"
Cohesion: 0.10
Nodes (29): gaegu, metadata, RootLayout(), viewport, dist(), MapListingPage(), ForYouPage(), BottomNav() (+21 more)

### Community 3 - "Package Dependencies & Lint"
Cohesion: 0.07
Nodes (36): eslintConfig, dependencies, framer-motion@^14.14.0, lucide-react@^1.72.0, next@16.4.6, react@19.3.0, react-dom@19.3.0, @supabase/supabase-js@^2.119.0 (+28 more)

### Community 4 - "Map Search"
Cohesion: 0.11
Nodes (28): CENTER, CHIPS, LatLng, LocateButton(), MapPage(), Ducktective(), LOOP, applyFilters() (+20 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.07
Nodes (27): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo, Ducktect best option (+19 more)

### Community 6 - "Compare Preferences"
Cohesion: 0.18
Nodes (22): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+14 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.08
Nodes (19): CoStar data kit, CoStar ingest run (ticket T3), after, args, before, communities, counts, db (+11 more)

### Community 8 - "Route Layouts"
Cohesion: 0.13
Nodes (14): MessageSheet(), Thread(), send(), PreferencesSheet(), Prefs, PrefsForm(), save(), Sheet() (+6 more)

### Community 9 - "Tours & Booking"
Cohesion: 0.18
Nodes (20): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, AGENTS, busyMembers(), openSlots(), SLOTS (+12 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 11 - "Map Data Model"
Cohesion: 0.20
Nodes (14): clean(), CommunityRow, isLosAngeles(), KitFloorPlan, KitRecord, ListingRow, Mapped, mapRecord() (+6 more)

### Community 12 - "Supabase Security & Schema"
Cohesion: 0.18
Nodes (5): Row-level security policies, dev-open-access.sql demo file, Supabase schema and migrations, env, PRIVATE

### Community 13 - "Apartment Kit Extraction"
Cohesion: 0.22
Nodes (5): APARTMENT_FILE, apartmentFile(), extractKit(), KitLine, readJsonl()

### Community 14 - "Listing Cards Schema"
Cohesion: 0.40
Nodes (4): communities table, listings table (one row per floor plan), Brooklyn-to-LA cutover (ticket T4), listing_cards view (migration 0005)

## Knowledge Gaps
- **12 isolated node(s):** `Flock app (README)`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `Friends flock` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 124 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `Package Dependencies & Lint` to `Listing & Picks Flow`, `CoStar Data Ingest`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **What connects `Flock app (README)`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Account & Compare Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.09890710382513661 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Route Layouts` to `Account & Compare Pages`, `Listing & Picks Flow`, `App Shell & Styling`, `Package Dependencies & Lint`, `Map Search`, `Compare Preferences`, `Tours & Booking`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Should `Listing & Picks Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.11627906976744186 - nodes in this community are weakly interconnected._
- **Why does `Ducktect best option` connect `Product Concept & Agents` to `Map Search`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Should `App Shell & Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.10384068278805121 - nodes in this community are weakly interconnected._