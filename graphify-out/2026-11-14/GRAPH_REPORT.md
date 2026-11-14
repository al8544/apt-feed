# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 174 files · ~111,508 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1225 nodes · 2956 edges · 62 communities (57 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a71d40c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- schemas.ts
- places.test.ts
- ingest-places.ts
- Package Dependencies & Lint
- map/page.tsx
- Product Concept & Agents
- compare/page.tsx
- CoStar Data Ingest
- find/page.tsx
- store.ts
- TypeScript Config
- Map Data Model
- Supabase Security & Schema
- ingest-costar-media.ts
- Listing Cards Schema
- Icon Components
- Agent Rules Docs
- enrich-apartments-com.ts
- places.ts
- Local test database
- media.ts
- Apartments.com enrichment: permission record
- AGENTS.md
- format.ts
- run.ts
- BookTourSheet.tsx
- ducktect-agent.ts
- ducktect-testkit.ts
- matcher.ts
- ListingReel.tsx
- demo-agent.mjs
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- 8. The agent (LangChain Deep Agents)
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect.ts
- group/page.tsx
- api.ts
- vexcel.ts
- agent.test.ts
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- SessionGate.tsx
- test-aerial.mjs
- ducktect-split.ts
- ducktect-run.ts
- AerialStore
- test-ducktect-api.mjs
- getGroupMembers
- picks/page.tsx
- test-places.mjs
- Flock — End-Goal Design & Implementation Guide
- groupMatch
- vexcel.test.ts
- proxy.ts
- 5. Data model
- 6. Data sources
- 2. Product scope

## God Nodes (most connected - your core abstractions)
1. `react` - 44 edges
2. `next` - 37 edges
3. `check()` - 34 edges
4. `money()` - 30 edges
5. `Avatar()` - 26 edges
6. `area()` - 25 edges
7. `Button()` - 24 edges
8. `getGroupMembers()` - 23 edges
9. `@supabase/supabase-js` - 23 edges
10. `ListingPhoto()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `3.1 Gaps between today and the goal` --references--> `getSwipeDeck()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (62 total, 5 thin omitted)

### Community 0 - "schemas.ts"
Cohesion: 0.11
Nodes (17): AgentContext, askInput, contextSchema, lat, lng, processFeedbackInput, rankApartmentsInput, resumeInput (+9 more)

### Community 1 - "places.test.ts"
Cohesion: 0.24
Nodes (8): Around, phrase(), Place, sanitizeTerm(), sanitizeTerms(), metresNorth(), shop(), tsQuery()

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "Package Dependencies & Lint"
Cohesion: 0.06
Nodes (43): eslintConfig, dependencies, framer-motion@^14.14.0, @langchain/core@^1.4.1, @langchain/langgraph@^1.7.4, @langchain/openai@^1.8.4, lucide-react@^1.72.0, next@16.4.6 (+35 more)

### Community 4 - "map/page.tsx"
Cohesion: 0.05
Nodes (59): CENTER, CHIPS, DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect(), Ducktective() (+51 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "compare/page.tsx"
Cohesion: 0.11
Nodes (33): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+25 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "find/page.tsx"
Cohesion: 0.06
Nodes (70): POST(), SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save() (+62 more)

### Community 9 - "store.ts"
Cohesion: 0.08
Nodes (39): GET(), Check, Compat, compat(), habitSimilarity(), habitTags(), JoinRules, lower() (+31 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 11 - "Map Data Model"
Cohesion: 0.24
Nodes (13): clean(), CommunityRow, isLosAngeles(), KitFloorPlan, KitRecord, ListingRow, Mapped, mapRecord() (+5 more)

### Community 12 - "Supabase Security & Schema"
Cohesion: 0.13
Nodes (8): Row-level security policies, dev-open-access.sql demo file, Supabase schema and migrations, env, PRIVATE, files, r, SCENARIOS

### Community 13 - "ingest-costar-media.ts"
Cohesion: 0.15
Nodes (12): APARTMENT_FILE, apartmentFile(), extractKit(), KitLine, readJsonl(), args, db, flag() (+4 more)

### Community 14 - "Listing Cards Schema"
Cohesion: 0.40
Nodes (4): communities table, listings table (one row per floor plan), Brooklyn-to-LA cutover (ticket T4), listing_cards view (migration 0005)

### Community 17 - "enrich-apartments-com.ts"
Cohesion: 0.17
Nodes (8): Parsed, args, db, flag(), opt(), overrides, Result, results

### Community 18 - "places.ts"
Cohesion: 0.16
Nodes (15): away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE, PlaceStore (+7 more)

### Community 19 - "Local test database"
Cohesion: 0.18
Nodes (10): Check row-level security, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop, Test the agent (+2 more)

### Community 20 - "media.ts"
Cohesion: 0.23
Nodes (6): photoUrl(), KitAttachment, pickGallery(), PRIORITY, isBlocked(), sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.12
Nodes (23): StashPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), CardHandle, Direction, SwipeCard() (+15 more)

### Community 24 - "run.ts"
Cohesion: 0.15
Nodes (18): maxDuration, POST(), maxDuration, POST(), maxDuration, POST(), POST(), POST() (+10 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.18
Nodes (21): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), AGENTS, BookTourSheet(), busyMembers() (+13 more)

### Community 26 - "ducktect-agent.ts"
Cohesion: 0.09
Nodes (29): createDucktectAgent(), DUCKTECT_TOOL_NAMES, ducktectModel(), interpretation, rationale, DucktectEnv, DucktectSession, checkpointer (+21 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.13
Nodes (20): cfg, fixture(), INTERPRETED, COM(), fakeVexcel(), lat(), needs(), plan (+12 more)

### Community 29 - "matcher.ts"
Cohesion: 0.15
Nodes (16): DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt(), Candidate, clean() (+8 more)

### Community 30 - "ListingReel.tsx"
Cohesion: 0.27
Nodes (12): dist(), MapListingPage(), ForYouPage(), Direction, EndOfDeck(), Pile(), Icon(), Action() (+4 more)

### Community 31 - "demo-agent.mjs"
Cohesion: 0.19
Nodes (9): readEvents(), admin, flock, opts, people, post(), st, tag (+1 more)

### Community 32 - "@supabase/supabase-js"
Cohesion: 0.20
Nodes (6): admin, anon, opts, people, st, tag

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

### Community 39 - "ducktect.ts"
Cohesion: 0.10
Nodes (33): json(), makeDucktectTools(), ALSO_CONSIDERED, Candidate, Constraint, explain(), explainNothing(), extraBeds() (+25 more)

### Community 40 - "group/page.tsx"
Cohesion: 0.12
Nodes (35): AccountPage(), Section(), Stats, GroupPage(), SectionHeader(), MembersPage(), Avatar(), AvatarUser (+27 more)

### Community 41 - "api.ts"
Cohesion: 0.18
Nodes (22): TourDetailPage(), rsvp(), MessageSheet(), Thread(), send(), cancelTour(), changed(), check() (+14 more)

### Community 42 - "vexcel.ts"
Cohesion: 0.13
Nodes (19): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+11 more)

### Community 43 - "agent.test.ts"
Cohesion: 0.15
Nodes (15): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), collect() (+7 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 48 - "SessionGate.tsx"
Cohesion: 0.16
Nodes (15): gaegu, metadata, RootLayout(), viewport, BottomNav(), TABS, IconName, ICONS (+7 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 50 - "ducktect-split.ts"
Cohesion: 0.12
Nodes (24): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+16 more)

### Community 51 - "ducktect-run.ts"
Cohesion: 0.19
Nodes (15): confirmWithSatellite(), newSession(), conciseSummary(), AERIAL_CALLS, AGENT_DEADLINE_MS, DAILY_LIMIT, startDucktect(), imageryLabels() (+7 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "getGroupMembers"
Cohesion: 0.28
Nodes (9): ComparePickPage(), Source, SOURCES, InvitePage(), NavBar(), FLOCK_NAME, getTouredListingIds(), inviteFriends() (+1 more)

### Community 59 - "picks/page.tsx"
Cohesion: 0.22
Nodes (16): ListingDetailPage(), toggleStash(), badge(), FlockPicksPage(), toggleStash(), Pick, Sort, toPicks() (+8 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.24
Nodes (9): anon, at(), check(), dead, LA, opts, st, store (+1 more)

### Community 62 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.18
Nodes (10): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface (+2 more)

### Community 64 - "groupMatch"
Cohesion: 0.29
Nodes (8): 3.1 Gaps between today and the goal, 3. Current state (read from the code), 7.1 Units and the feasibility rule (settled), 7.2 Listing fit (hard constraints, then score), 7.3 Voting and the flock score, 7.4 Roommate compatibility, open-flock joining, privacy, 7. Matching and scoring (pure code, `lib/match/`), groupMatch()

### Community 65 - "vexcel.test.ts"
Cohesion: 0.29
Nodes (4): canonicalPhrase(), normalizePhrase(), squareWkt(), checkable

### Community 66 - "proxy.ts"
Cohesion: 0.33
Nodes (5): 4.1 Target folder layout, 4. Target architecture, AUTH_PAGES, config, proxy()

### Community 67 - "5. Data model"
Cohesion: 0.40
Nodes (5): 5.1 Property data (from the CoStar kit), 5.2 Media and enrichment, 5.3 People, flocks, decisions, 5.4 Row-level security (sketch), 5. Data model

### Community 68 - "6. Data sources"
Cohesion: 0.40
Nodes (5): 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**, 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**, 6.3 Vexcel — aerial evidence and prose search **[planned]**, 6.4 Out of scope, 6. Data sources

### Community 69 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 436 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `ducktect-run.ts` to `ingest-places.ts`, `Package Dependencies & Lint`, `CoStar Data Ingest`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `places.ts`, `run.ts`, `ducktect-testkit.ts`, `demo-agent.mjs`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `test-ducktect-api.mjs`, `test-places.mjs`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `schemas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11083743842364532 - nodes in this community are weakly interconnected._
- **Why does `react` connect `format.ts` to `Package Dependencies & Lint`, `map/page.tsx`, `compare/page.tsx`, `group/page.tsx`, `find/page.tsx`, `api.ts`, `SessionGate.tsx`, `getGroupMembers`, `BookTourSheet.tsx`, `picks/page.tsx`, `ListingReel.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `next` connect `format.ts` to `proxy.ts`, `Package Dependencies & Lint`, `map/page.tsx`, `compare/page.tsx`, `group/page.tsx`, `find/page.tsx`, `api.ts`, `SessionGate.tsx`, `getGroupMembers`, `BookTourSheet.tsx`, `picks/page.tsx`, `ListingReel.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `Package Dependencies & Lint` be split into smaller, more focused modules?**
  _Cohesion score 0.05757575757575758 - nodes in this community are weakly interconnected._