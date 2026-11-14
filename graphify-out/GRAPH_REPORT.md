# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 141 files · ~74,820 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 896 nodes · 2176 edges · 46 communities (42 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc49dc26`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Account & Compare Pages
- discover.ts
- 5. Data model
- Package Dependencies & Lint
- app/layout.tsx
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
- next
- run.ts
- map/page.tsx
- flock-agent.ts
- index.ts
- agent.test.ts
- matcher.ts
- dependencies
- demo-agent.mjs
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- 8. The agent (LangChain Deep Agents)
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- groupMatch
- store.ts
- proxy.ts
- scripts
- 6. Data sources
- 2. Product scope
- ref_node_child_process

## God Nodes (most connected - your core abstractions)
1. `react` - 42 edges
2. `next` - 36 edges
3. `check()` - 33 edges
4. `money()` - 28 edges
5. `Avatar()` - 26 edges
6. `getGroupMembers()` - 25 edges
7. `area()` - 25 edges
8. `Button()` - 24 edges
9. `GroupPage()` - 21 edges
10. `ListingPhoto()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `5.1 Property data (from the CoStar kit)` --references--> `groupMatch()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (46 total, 4 thin omitted)

### Community 0 - "Account & Compare Pages"
Cohesion: 0.05
Nodes (97): AccountPage(), Section(), Stats, summary(), YourFlocksPage(), load(), GroupPage(), SectionHeader() (+89 more)

### Community 1 - "discover.ts"
Cohesion: 0.12
Nodes (23): GET(), DAILY_LIMIT, maxDuration, POST(), Check, Compat, compat(), habitSimilarity() (+15 more)

### Community 2 - "5. Data model"
Cohesion: 0.40
Nodes (5): 5.1 Property data (from the CoStar kit), 5.2 Media and enrichment, 5.3 People, flocks, decisions, 5.4 Row-level security (sketch), 5. Data model

### Community 3 - "Package Dependencies & Lint"
Cohesion: 0.12
Nodes (21): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, @types/node@^20, @types/react@^19 (+13 more)

### Community 4 - "app/layout.tsx"
Cohesion: 0.31
Nodes (6): gaegu, metadata, RootLayout(), viewport, BottomNav(), MotionProvider()

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "Compare Preferences"
Cohesion: 0.11
Nodes (33): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+25 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "find/page.tsx"
Cohesion: 0.05
Nodes (61): POST(), SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save() (+53 more)

### Community 9 - "listing-fit.ts"
Cohesion: 0.16
Nodes (19): closestMisses(), fit(), Miss, money(), same(), activeMembers(), apportion(), bedroomsNeeded() (+11 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 11 - "Map Data Model"
Cohesion: 0.24
Nodes (13): clean(), CommunityRow, isLosAngeles(), KitFloorPlan, KitRecord, ListingRow, Mapped, mapRecord() (+5 more)

### Community 12 - "Supabase Security & Schema"
Cohesion: 0.18
Nodes (5): Row-level security policies, dev-open-access.sql demo file, Supabase schema and migrations, env, PRIVATE

### Community 13 - "ingest-costar-media.ts"
Cohesion: 0.15
Nodes (12): APARTMENT_FILE, apartmentFile(), extractKit(), KitLine, readJsonl(), args, db, flag() (+4 more)

### Community 14 - "Listing Cards Schema"
Cohesion: 0.40
Nodes (4): communities table, listings table (one row per floor plan), Brooklyn-to-LA cutover (ticket T4), listing_cards view (migration 0005)

### Community 17 - "enrich-apartments-com.ts"
Cohesion: 0.17
Nodes (8): Parsed, args, db, flag(), opt(), overrides, Result, results

### Community 18 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.18
Nodes (10): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface (+2 more)

### Community 19 - "Local test database"
Cohesion: 0.18
Nodes (10): Check row-level security, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop, Test the agent (+2 more)

### Community 20 - "media.ts"
Cohesion: 0.23
Nodes (6): photoUrl(), KitAttachment, pickGallery(), PRIORITY, isBlocked(), sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "next"
Cohesion: 0.07
Nodes (61): ComparePickPage(), Source, SOURCES, ListingDetailPage(), toggleStash(), dist(), MapListingPage(), MapPage() (+53 more)

### Community 24 - "run.ts"
Cohesion: 0.17
Nodes (16): maxDuration, POST(), maxDuration, POST(), POST(), POST(), createFlockAgent(), threadId() (+8 more)

### Community 25 - "map/page.tsx"
Cohesion: 0.11
Nodes (26): summary(), CENTER, CHIPS, LatLng, LocateButton(), Ducktective(), LOOP, applyFilters() (+18 more)

### Community 26 - "flock-agent.ts"
Cohesion: 0.11
Nodes (20): checkpointer, DEFAULT_MODEL, FLOCK_PROMPT, SEARCHER_PROMPT, deepagents@^1.16.5, langchain@^1.6.6, @langchain/core@^1.4.1, zod@^4.6.7 (+12 more)

### Community 27 - "index.ts"
Cohesion: 0.15
Nodes (14): AgentContext, askInput, contextSchema, processFeedbackInput, rankApartmentsInput, searchApartmentsInput, sendInvitesInput, updateShortlistInput (+6 more)

### Community 28 - "agent.test.ts"
Cohesion: 0.16
Nodes (14): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), AgentEvent (+6 more)

### Community 29 - "matcher.ts"
Cohesion: 0.16
Nodes (15): inventedNumbers(), norm(), Analyze, analyzeFlocks(), buildPrompt(), Candidate, clean(), FALLBACK_REASON (+7 more)

### Community 30 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, framer-motion@^14.14.0, @langchain/langgraph@^1.7.4, @langchain/openai@^1.8.4, lucide-react@^1.72.0, next@16.4.6, react@19.3.0, react-dom@19.3.0 (+8 more)

### Community 31 - "demo-agent.mjs"
Cohesion: 0.20
Nodes (9): readEvents(), admin, flock, opts, people, post(), st, tag (+1 more)

### Community 32 - "@supabase/supabase-js"
Cohesion: 0.17
Nodes (8): @supabase/supabase-js@^2.119.0, @supabase/supabase-js, admin, anon, opts, people, st, tag

### Community 33 - "test-flocks.mjs"
Cohesion: 0.17
Nodes (7): admin, anon, flocks, opts, people, st, tag

### Community 34 - "test-proposals.mjs"
Cohesion: 0.20
Nodes (9): admin, must(), opts, people, proposal(), proposals, propose(), st (+1 more)

### Community 35 - "8. The agent (LangChain Deep Agents)"
Cohesion: 0.18
Nodes (11): 8.10 LangChain track checklist, 8.1 How we use each Deep Agents capability, 8.2 Topology, 8.3 Tools (LangChain `tool()` + zod), 8.4 Safety rules, 8.5 Runtime sketch, 8.6 Runtime notes and risks **[verify]**, 8.7 Memory (+3 more)

### Community 36 - "test-agent-api.mjs"
Cohesion: 0.18
Nodes (6): admin, flock, opts, people, st, tag

### Community 37 - "test-agent-db.mjs"
Cohesion: 0.20
Nodes (6): admin, anon, opts, people, st, tag

### Community 38 - "apartments-com.ts"
Cohesion: 0.50
Nodes (8): asArray(), httpsUrl(), imageUrls(), isObj(), Json, jsonLdNodes(), MediaItem, parse()

### Community 39 - "groupMatch"
Cohesion: 0.29
Nodes (8): 3.1 Gaps between today and the goal, 3. Current state (read from the code), 7.1 Units and the feasibility rule (settled), 7.2 Listing fit (hard constraints, then score), 7.3 Voting and the flock score, 7.4 Roommate compatibility, open-flock joining, privacy, 7. Matching and scoring (pure code, `lib/match/`), groupMatch()

### Community 40 - "store.ts"
Cohesion: 0.25
Nodes (6): Needs, Plan, Row, SavedPick, ShortlistRow, Criterion

### Community 41 - "proxy.ts"
Cohesion: 0.33
Nodes (5): 4.1 Target folder layout, 4. Target architecture, AUTH_PAGES, config, proxy()

### Community 42 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, dev:local, lint, start

### Community 43 - "6. Data sources"
Cohesion: 0.40
Nodes (5): 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**, 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**, 6.3 Vexcel — aerial evidence and prose search **[planned]**, 6.4 Out of scope, 6. Data sources

### Community 44 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `@supabase/supabase-js` to `discover.ts`, `test-flocks.mjs`, `Package Dependencies & Lint`, `test-agent-api.mjs`, `test-agent-db.mjs`, `test-proposals.mjs`, `CoStar Data Ingest`, `store.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `run.ts`, `demo-agent.mjs`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Account & Compare Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05284147557328016 - nodes in this community are weakly interconnected._
- **Why does `react` connect `find/page.tsx` to `Account & Compare Pages`, `Package Dependencies & Lint`, `app/layout.tsx`, `Compare Preferences`, `next`, `map/page.tsx`, `dependencies`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Should `discover.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11954022988505747 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `Account & Compare Pages`, `Package Dependencies & Lint`, `app/layout.tsx`, `Compare Preferences`, `find/page.tsx`, `proxy.ts`, `dependencies`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `Package Dependencies & Lint` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._