# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 184 files · ~120,687 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1304 nodes · 3173 edges · 70 communities (64 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92e94659`
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
- ducktect-split.ts
- Local test database
- media.ts
- Apartments.com enrichment: permission record
- AGENTS.md
- format.ts
- run.ts
- BookTourSheet.tsx
- schemas.ts
- ducktect-testkit.ts
- matcher.ts
- account/page.tsx
- places.ts
- Sheet
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- Flock — End-Goal Design & Implementation Guide
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect.ts
- ducktect-agent.ts
- api.ts
- vexcel.ts
- subagents.test.ts
- matcher.ts
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- rerunShortlist
- test-aerial.mjs
- MapSearch.tsx
- ducktect-run.ts
- test-pins.mjs
- ref_node_fs
- AerialStore
- test-ducktect-api.mjs
- next
- ducktect-notes.ts
- MapFiltersSheet.tsx
- money
- test-places.mjs
- prompts.ts
- 8. The agent (LangChain Deep Agents)
- Flock
- groupMatch
- ref_node_assert
- proxy.ts
- 6. Data sources
- 7. Matching and scoring (pure code, `lib/match/`)
- 2. Product scope

## God Nodes (most connected - your core abstractions)
1. `react` - 46 edges
2. `check()` - 37 edges
3. `next` - 37 edges
4. `money()` - 30 edges
5. `area()` - 25 edges
6. `Button()` - 24 edges
7. `@supabase/supabase-js` - 24 edges
8. `getGroupMembers()` - 23 edges
9. `GroupPage()` - 23 edges
10. `rerunShortlist()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `Voting and the flock score (ticket T8)` --references--> `flockScore()`  [INFERRED]
  README.md → lib/compare.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (70 total, 6 thin omitted)

### Community 0 - "listing/[id]/page.tsx"
Cohesion: 0.21
Nodes (15): toggleLike(), badge(), FlockPicksPage(), toggleLike(), Pick, Sort, toPicks(), toggle() (+7 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (47): eslintConfig, dependencies, framer-motion@^14.14.0, langchain@^1.6.6, @langchain/core@^1.4.1, @langchain/langgraph@^1.7.4, @langchain/openai@^1.8.4, lucide-react@^1.72.0 (+39 more)

### Community 4 - "map/page.tsx"
Cohesion: 0.16
Nodes (14): CENTER, CHIPS, DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect(), DucktectState (+6 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "compare/page.tsx"
Cohesion: 0.06
Nodes (62): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+54 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "find/page.tsx"
Cohesion: 0.06
Nodes (62): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save(), FindFlockPage() (+54 more)

### Community 9 - "store.ts"
Cohesion: 0.09
Nodes (34): isReason(), Outcome, Reason, Refresh, Rejection, ruledOut(), stillCounts(), CandidateQuery (+26 more)

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

### Community 18 - "ducktect-split.ts"
Cohesion: 0.11
Nodes (25): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+17 more)

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "media.ts"
Cohesion: 0.33
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.23
Nodes (13): ListingDetailPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), PhotoCarousel(), FloorPlan, getFloorPlans() (+5 more)

### Community 24 - "run.ts"
Cohesion: 0.14
Nodes (21): POST(), maxDuration, POST(), maxDuration, POST(), POST(), POST(), POST() (+13 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.22
Nodes (17): AGENTS, busyMembers(), openSlots(), SLOTS, Slots(), add(), seen(), seenKey() (+9 more)

### Community 26 - "schemas.ts"
Cohesion: 0.11
Nodes (24): checkpointer, DEFAULT_MODEL, AgentContext, contextSchema, findOpenFlocksInput, lat, lng, processFeedbackInput (+16 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.15
Nodes (18): fixture(), MAX_PLACES, SHORTLIST, RawInterpretation, climb, HARD, quietNights, COM() (+10 more)

### Community 28 - "matcher.ts"
Cohesion: 0.14
Nodes (20): GET(), Check, Compat, compat(), habitSimilarity(), habitTags(), JoinRules, lower() (+12 more)

### Community 29 - "account/page.tsx"
Cohesion: 0.16
Nodes (25): AccountPage(), Section(), Stats, GroupPage(), SectionHeader(), findAddress(), LA, PanTo() (+17 more)

### Community 30 - "places.ts"
Cohesion: 0.13
Nodes (22): Around, away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE (+14 more)

### Community 31 - "Sheet"
Cohesion: 0.16
Nodes (20): summary(), YourFlocksPage(), load(), open(), MembersPage(), Avatar(), AvatarUser, DUCKS (+12 more)

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
Cohesion: 0.18
Nodes (10): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface (+2 more)

### Community 36 - "test-agent-api.mjs"
Cohesion: 0.18
Nodes (6): admin, flock, opts, people, st, tag

### Community 37 - "test-agent-db.mjs"
Cohesion: 0.20
Nodes (6): admin, anon, opts, people, st, tag

### Community 38 - "apartments-com.ts"
Cohesion: 0.35
Nodes (9): asArray(), httpsUrl(), imageUrls(), isBlocked(), isObj(), Json, jsonLdNodes(), MediaItem (+1 more)

### Community 39 - "ducktect.ts"
Cohesion: 0.16
Nodes (17): ALSO_CONSIDERED, Candidate, Constraint, explainNothing(), extraBeds(), findCandidates(), MAX_PICKS, needsFor() (+9 more)

### Community 40 - "ducktect-agent.ts"
Cohesion: 0.13
Nodes (18): createDucktectAgent(), DUCKTECT_TOOL_NAMES, ducktectModel(), interpretation, json(), makeDucktectTools(), rationale, cfg (+10 more)

### Community 41 - "api.ts"
Cohesion: 0.15
Nodes (27): TourDetailPage(), rsvp(), MessageSheet(), Thread(), send(), cancelTour(), changed(), check() (+19 more)

### Community 42 - "vexcel.ts"
Cohesion: 0.14
Nodes (18): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+10 more)

### Community 43 - "subagents.test.ts"
Cohesion: 0.06
Nodes (35): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), readEvents() (+27 more)

### Community 44 - "matcher.ts"
Cohesion: 0.15
Nodes (16): DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt(), Candidate, clean() (+8 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 48 - "rerunShortlist"
Cohesion: 0.17
Nodes (7): explain(), rerunShortlist(), AgentStore, ctxOf(), fact(), json(), makeTools()

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 50 - "MapSearch.tsx"
Cohesion: 0.19
Nodes (10): summary(), Ducktective(), LOOP, MapSearch(), choose(), fitTo(), Option, PricePill() (+2 more)

### Community 51 - "ducktect-run.ts"
Cohesion: 0.17
Nodes (19): maxDuration, POST(), confirmWithSatellite(), interpret(), newSession(), conciseSummary(), rank(), AERIAL_CALLS (+11 more)

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
Cohesion: 0.21
Nodes (13): ComparePickPage(), Source, SOURCES, InvitePage(), StashPage(), NavBar(), RankingRow(), FLOCK_NAME (+5 more)

### Community 57 - "ducktect-notes.ts"
Cohesion: 0.15
Nodes (17): CHECK, dollars(), DucktectPanel(), PickCard(), Progress(), STEP_LABELS, DucktectPick, DucktectResult (+9 more)

### Community 58 - "MapFiltersSheet.tsx"
Cohesion: 0.19
Nodes (14): applyFilters(), BATHS, BEDS, FiltersBody(), Heading(), MapFiltersSheet(), matchesQuery(), Pills() (+6 more)

### Community 59 - "money"
Cohesion: 0.25
Nodes (15): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), BookTourSheet(), likedByText(), PickCard() (+7 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.22
Nodes (10): @supabase/supabase-js, anon, at(), check(), dead, LA, opts, st (+2 more)

### Community 61 - "prompts.ts"
Cohesion: 0.21
Nodes (11): DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT, DUCKTECT_SCOUT_PROMPT, FLOCK_PROMPT, MATCHER_PROMPT, MATCHER_SUBAGENT_PROMPT, SEARCHER_PROMPT, apartmentSearcher() (+3 more)

### Community 62 - "8. The agent (LangChain Deep Agents)"
Cohesion: 0.18
Nodes (11): 8.10 LangChain track checklist, 8.1 How we use each Deep Agents capability, 8.2 Topology, 8.3 Tools (LangChain `tool()` + zod), 8.4 Safety rules, 8.5 Runtime sketch, 8.6 Runtime notes and risks **[verify]**, 8.7 Memory (+3 more)

### Community 63 - "Flock"
Cohesion: 0.20
Nodes (9): CoStar listings (ticket T3), Database, Deploy on Vercel, Flock, Flocks (ticket T6), Galleries (ticket T5), Getting Started, Learn More (+1 more)

### Community 64 - "groupMatch"
Cohesion: 0.31
Nodes (9): 3.1 Gaps between today and the goal, 3. Current state (read from the code), 5.1 Property data (from the CoStar kit), 5.2 Media and enrichment, 5.3 People, flocks, decisions, 5.4 Row-level security (sketch), 5. Data model, groupMatch() (+1 more)

### Community 65 - "ref_node_assert"
Cohesion: 0.25
Nodes (4): canonicalPhrase(), normalizePhrase(), squareWkt(), checkable

### Community 66 - "proxy.ts"
Cohesion: 0.33
Nodes (5): 4.1 Target folder layout, 4. Target architecture, AUTH_PAGES, config, proxy()

### Community 67 - "6. Data sources"
Cohesion: 0.40
Nodes (5): 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**, 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**, 6.3 Vexcel — aerial evidence and prose search **[planned]**, 6.4 Out of scope, 6. Data sources

### Community 68 - "7. Matching and scoring (pure code, `lib/match/`)"
Cohesion: 0.40
Nodes (5): 7.1 Units and the feasibility rule (settled), 7.2 Listing fit (hard constraints, then score), 7.3 Voting and the flock score, 7.4 Roommate compatibility, open-flock joining, privacy, 7. Matching and scoring (pure code, `lib/match/`)

### Community 69 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 462 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-places.mjs` to `ingest-places.ts`, `package.json`, `CoStar Data Ingest`, `store.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `run.ts`, `matcher.ts`, `places.ts`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `subagents.test.ts`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `ducktect-run.ts`, `test-pins.mjs`, `test-ducktect-api.mjs`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `listing/[id]/page.tsx`, `package.json`, `map/page.tsx`, `compare/page.tsx`, `find/page.tsx`, `api.ts`, `MapSearch.tsx`, `format.ts`, `next`, `BookTourSheet.tsx`, `MapFiltersSheet.tsx`, `money`, `ducktect-notes.ts`, `account/page.tsx`, `Sheet`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05272108843537415 - nodes in this community are weakly interconnected._
- **Why does `Ducktect best option` connect `Product Concept & Agents` to `MapSearch.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Product Concept & Agents` be split into smaller, more focused modules?**
  _Cohesion score 0.06306306306306306 - nodes in this community are weakly interconnected._