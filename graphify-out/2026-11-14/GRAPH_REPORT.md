# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 184 files · ~120,444 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1303 nodes · 3172 edges · 63 communities (58 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `858ad477`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- listing/[id]/page.tsx
- react
- ingest-places.ts
- package.json
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
- flock-agent.ts
- ducktect-testkit.ts
- matcher.ts
- account/page.tsx
- DucktectPanel.tsx
- demo-agent.mjs
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- Flock — End-Goal Design & Implementation Guide
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect.ts
- subagents.test.ts
- api.ts
- vexcel.ts
- agent.test.ts
- schemas.ts
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- SessionGate.tsx
- test-aerial.mjs
- MapSearch
- ducktect-run.ts
- test-pins.mjs
- ref_node_fs
- AerialStore
- test-ducktect-api.mjs
- next
- ducktect-notes.ts
- MapFiltersSheet.tsx
- ListingReel.tsx
- test-places.mjs
- Icon.tsx
- ref_node_assert

## God Nodes (most connected - your core abstractions)
1. `react` - 46 edges
2. `check()` - 37 edges
3. `next` - 37 edges
4. `money()` - 30 edges
5. `area()` - 25 edges
6. `Button()` - 24 edges
7. `@supabase/supabase-js` - 24 edges
8. `getGroupMembers()` - 23 edges
9. `rerunShortlist()` - 23 edges
10. `GroupPage()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `3.1 Gaps between today and the goal` --references--> `getSwipeDeck()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (63 total, 5 thin omitted)

### Community 0 - "listing/[id]/page.tsx"
Cohesion: 0.22
Nodes (16): ListingDetailPage(), toggleLike(), badge(), FlockPicksPage(), toggleLike(), Pick, Sort, toPicks() (+8 more)

### Community 1 - "react"
Cohesion: 0.13
Nodes (10): Sheet(), seen(), seenKey(), SmallerFlockPrompt(), acknowledge(), UserSwitcher(), getLeftMembers(), GROUP_ID (+2 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (48): eslintConfig, dependencies, deepagents@^1.16.5, framer-motion@^14.14.0, langchain@^1.6.6, @langchain/core@^1.4.1, @langchain/langgraph@^1.7.4, @langchain/openai@^1.8.4 (+40 more)

### Community 4 - "map/page.tsx"
Cohesion: 0.16
Nodes (14): summary(), CENTER, CHIPS, DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect() (+6 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "compare/page.tsx"
Cohesion: 0.07
Nodes (47): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+39 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "find/page.tsx"
Cohesion: 0.06
Nodes (71): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save(), FindFlockPage() (+63 more)

### Community 9 - "store.ts"
Cohesion: 0.07
Nodes (41): explain(), isReason(), Outcome, Reason, Refresh, Rejection, rerunShortlist(), ruledOut() (+33 more)

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

### Community 17 - "enrich-apartments-com.ts"
Cohesion: 0.17
Nodes (8): Parsed, args, db, flag(), opt(), overrides, Result, results

### Community 18 - "places.ts"
Cohesion: 0.06
Nodes (49): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+41 more)

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "media.ts"
Cohesion: 0.39
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.23
Nodes (15): ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), SwipeCard(), fling(), onDragEnd(), PhotoCarousel() (+7 more)

### Community 24 - "run.ts"
Cohesion: 0.15
Nodes (20): POST(), maxDuration, POST(), maxDuration, POST(), POST(), POST(), POST() (+12 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.14
Nodes (29): MembersPage(), addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), Avatar(), AvatarUser (+21 more)

### Community 26 - "flock-agent.ts"
Cohesion: 0.09
Nodes (30): interpretation, json(), rationale, DucktectSession, checkpointer, DEFAULT_MODEL, DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT (+22 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.16
Nodes (17): DUCKTECT_TOOL_NAMES, cfg, fixture(), INTERPRETED, DucktectEnv, COM(), fakeVexcel(), lat() (+9 more)

### Community 28 - "matcher.ts"
Cohesion: 0.07
Nodes (36): GET(), DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt(), Candidate (+28 more)

### Community 29 - "account/page.tsx"
Cohesion: 0.13
Nodes (31): AccountPage(), Section(), Stats, GroupPage(), SectionHeader(), findAddress(), LA, PanTo() (+23 more)

### Community 30 - "DucktectPanel.tsx"
Cohesion: 0.20
Nodes (10): Ducktective(), LOOP, CHECK, dollars(), DucktectPanel(), DucktectState, PickCard(), Progress() (+2 more)

### Community 31 - "demo-agent.mjs"
Cohesion: 0.20
Nodes (8): admin, flock, opts, people, post(), st, tag, turn()

### Community 32 - "@supabase/supabase-js"
Cohesion: 0.20
Nodes (6): admin, anon, opts, people, st, tag

### Community 33 - "test-flocks.mjs"
Cohesion: 0.17
Nodes (7): admin, anon, flocks, opts, people, st, tag

### Community 34 - "test-proposals.mjs"
Cohesion: 0.20
Nodes (9): admin, must(), opts, people, proposal(), proposals, propose(), st (+1 more)

### Community 35 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.05
Nodes (35): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 2.1 What a user does (+27 more)

### Community 36 - "test-agent-api.mjs"
Cohesion: 0.18
Nodes (6): admin, flock, opts, people, st, tag

### Community 37 - "test-agent-db.mjs"
Cohesion: 0.20
Nodes (6): admin, anon, opts, people, st, tag

### Community 38 - "apartments-com.ts"
Cohesion: 0.31
Nodes (9): asArray(), httpsUrl(), imageUrls(), isBlocked(), isObj(), Json, jsonLdNodes(), MediaItem (+1 more)

### Community 39 - "ducktect.ts"
Cohesion: 0.11
Nodes (33): makeDucktectTools(), ALSO_CONSIDERED, Candidate, confirmWithSatellite(), Constraint, explain(), explainNothing(), extraBeds() (+25 more)

### Community 40 - "subagents.test.ts"
Cohesion: 0.22
Nodes (10): feedbackInput, cfg, FLOCK, members, P(), plan(), plans(), seed() (+2 more)

### Community 41 - "api.ts"
Cohesion: 0.15
Nodes (27): TourDetailPage(), rsvp(), MessageSheet(), Thread(), send(), cancelTour(), changed(), check() (+19 more)

### Community 42 - "vexcel.ts"
Cohesion: 0.14
Nodes (13): ALIASES, ATTRIBUTE_PHRASES, canonicalPhrase(), FEELINGS, INDOOR, Json, MAX_IMAGERY_LABELS, normalizePhrase() (+5 more)

### Community 43 - "agent.test.ts"
Cohesion: 0.14
Nodes (16): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), readEvents() (+8 more)

### Community 44 - "schemas.ts"
Cohesion: 0.27
Nodes (10): AgentContext, contextSchema, findOpenFlocksInput, lat, lng, processFeedbackInput, rankApartmentsInput, searchApartmentsInput (+2 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 48 - "SessionGate.tsx"
Cohesion: 0.17
Nodes (15): gaegu, metadata, RootLayout(), viewport, BottomNav(), TABS, MotionProvider(), AUTH_PAGES (+7 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 50 - "MapSearch"
Cohesion: 0.50
Nodes (4): MapSearch(), choose(), fitTo(), homes()

### Community 51 - "ducktect-run.ts"
Cohesion: 0.17
Nodes (16): maxDuration, POST(), createDucktectAgent(), ducktectModel(), newSession(), conciseSummary(), AERIAL_CALLS, AGENT_DEADLINE_MS (+8 more)

### Community 52 - "test-pins.mjs"
Cohesion: 0.20
Nodes (7): admin, flocks, opts, people, pinA, st, tag

### Community 53 - "ref_node_fs"
Cohesion: 0.40
Nodes (3): files, r, SCENARIOS

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "next"
Cohesion: 0.18
Nodes (13): ComparePickPage(), Source, SOURCES, InvitePage(), StashPage(), NavBar(), FLOCK_NAME, getStash() (+5 more)

### Community 57 - "ducktect-notes.ts"
Cohesion: 0.23
Nodes (10): DucktectResult, Note, notesFor(), plural(), readingLines(), around, base(), interpreted() (+2 more)

### Community 58 - "MapFiltersSheet.tsx"
Cohesion: 0.31
Nodes (10): applyFilters(), BATHS, BEDS, FiltersBody(), Heading(), MapFiltersSheet(), matchesQuery(), Pills() (+2 more)

### Community 59 - "ListingReel.tsx"
Cohesion: 0.15
Nodes (18): dist(), MapListingPage(), ForYouPage(), Action(), CardHandle, Direction, ListingReel(), onSwiped() (+10 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.22
Nodes (10): @supabase/supabase-js, anon, at(), check(), dead, LA, opts, st (+2 more)

### Community 61 - "Icon.tsx"
Cohesion: 0.36
Nodes (7): Direction, EndOfDeck(), Pile(), Icon(), IconName, ICONS, getMySwipes()

### Community 65 - "ref_node_assert"
Cohesion: 0.17
Nodes (10): C, fakeVexcel(), isObj(), median(), num(), parseDetect(), parseProperty(), Result (+2 more)

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 461 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-places.mjs` to `ingest-places.ts`, `package.json`, `CoStar Data Ingest`, `store.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `places.ts`, `run.ts`, `matcher.ts`, `demo-agent.mjs`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `ducktect-run.ts`, `test-pins.mjs`, `test-ducktect-api.mjs`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.13438735177865613 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `listing/[id]/page.tsx`, `package.json`, `map/page.tsx`, `compare/page.tsx`, `find/page.tsx`, `api.ts`, `SessionGate.tsx`, `Icon.tsx`, `format.ts`, `next`, `BookTourSheet.tsx`, `MapFiltersSheet.tsx`, `ListingReel.tsx`, `account/page.tsx`, `DucktectPanel.tsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `listing/[id]/page.tsx`, `react`, `package.json`, `Flock — End-Goal Design & Implementation Guide`, `compare/page.tsx`, `find/page.tsx`, `api.ts`, `SessionGate.tsx`, `format.ts`, `BookTourSheet.tsx`, `ListingReel.tsx`, `account/page.tsx`, `DucktectPanel.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05142857142857143 - nodes in this community are weakly interconnected._