# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 179 files · ~118,457 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1293 nodes · 3143 edges · 76 communities (70 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f03d9a7b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Sheet
- requireUser
- ingest-places.ts
- package.json
- map/page.tsx
- Product Concept & Agents
- compare/page.tsx
- CoStar Data Ingest
- new/page.tsx
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
- discover.ts
- BookTourSheet.tsx
- flock-agent.ts
- ducktect-testkit.ts
- agent.test.ts
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
- schemas.ts
- vexcel.ts
- agent.test.ts
- MapFiltersSheet.tsx
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- SessionGate.tsx
- test-aerial.mjs
- ducktect-split.ts
- ducktect-run.ts
- next
- Avatar
- AerialStore
- test-ducktect-api.mjs
- getGroupMembers
- api.ts
- picks/page.tsx
- Flock
- test-places.mjs
- flocks/[id]/page.tsx
- subagents.test.ts
- find/page.tsx
- ducktect-notes.ts
- flocks.ts
- react
- Flock — End-Goal Design & Implementation Guide
- test-pins.mjs
- groupMatch
- EndOfDeck.tsx
- vexcel.test.ts
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
8. `GroupPage()` - 23 edges
9. `rerunShortlist()` - 23 edges
10. `getGroupMembers()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `Voting and the flock score (ticket T8)` --references--> `flockScore()`  [INFERRED]
  README.md → lib/compare.ts
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (76 total, 6 thin omitted)

### Community 0 - "Sheet"
Cohesion: 0.21
Nodes (13): label(), ReasonSheet(), Sheet(), seen(), seenKey(), SmallerFlockPrompt(), acknowledge(), UserSwitcher() (+5 more)

### Community 1 - "requireUser"
Cohesion: 0.16
Nodes (13): POST(), maxDuration, POST(), maxDuration, POST(), GET(), POST(), POST() (+5 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (44): eslintConfig, dependencies, deepagents@^1.16.5, langchain@^1.6.6, @langchain/openai@^1.8.4, lucide-react@^1.72.0, next@16.4.6, react@19.3.0 (+36 more)

### Community 4 - "map/page.tsx"
Cohesion: 0.11
Nodes (20): CENTER, CHIPS, DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect(), CHECK (+12 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.07
Nodes (26): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, Flock Deep Agent (deepagents), Two-minute demo, Ducktect best option, Flock product (end-goal design) (+18 more)

### Community 6 - "compare/page.tsx"
Cohesion: 0.17
Nodes (24): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+16 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.08
Nodes (20): CoStar data kit, CoStar track (Inside and Out), CoStar ingest run (ticket T3), after, args, before, communities, counts (+12 more)

### Community 8 - "new/page.tsx"
Cohesion: 0.24
Nodes (16): Basics(), save(), Story(), save(), NewFlockForm(), create(), NewFlockPage(), Step (+8 more)

### Community 9 - "store.ts"
Cohesion: 0.06
Nodes (42): explain(), isReason(), Outcome, Reason, REASONS, Refresh, Rejection, rerunShortlist() (+34 more)

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

### Community 18 - "places.ts"
Cohesion: 0.13
Nodes (22): Around, away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE (+14 more)

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "media.ts"
Cohesion: 0.23
Nodes (6): photoUrl(), KitAttachment, pickGallery(), PRIORITY, isBlocked(), sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.21
Nodes (21): ListingDetailPage(), StashPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), SwipeCard(), fling() (+13 more)

### Community 24 - "discover.ts"
Cohesion: 0.15
Nodes (19): Check, Compat, compat(), habitSimilarity(), habitTags(), JoinRules, lower(), OpenFlock (+11 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.18
Nodes (21): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), AGENTS, busyMembers(), openSlots() (+13 more)

### Community 26 - "flock-agent.ts"
Cohesion: 0.09
Nodes (25): checkpointer, DEFAULT_MODEL, DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT, DUCKTECT_SCOUT_PROMPT, FLOCK_PROMPT, MATCHER_PROMPT, MATCHER_SUBAGENT_PROMPT (+17 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.13
Nodes (21): fixture(), DucktectEnv, MAX_PLACES, SHORTLIST, RawInterpretation, climb, HARD, homes() (+13 more)

### Community 28 - "agent.test.ts"
Cohesion: 0.19
Nodes (11): collect(), DUCKTECT_TOOL_NAMES, cfg, collect(), INTERPRETED, AgentEvent, clip(), kind() (+3 more)

### Community 29 - "matcher.ts"
Cohesion: 0.14
Nodes (17): DAILY_LIMIT, maxDuration, POST(), inventedNumbers(), norm(), Analyze, analyzeFlocks(), buildPrompt() (+9 more)

### Community 30 - "ListingReel.tsx"
Cohesion: 0.19
Nodes (15): dist(), MapListingPage(), TABS, Icon(), IconName, ICONS, Action(), CardHandle (+7 more)

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
Cohesion: 0.12
Nodes (32): createDucktectAgent(), ducktectModel(), interpretation, json(), makeDucktectTools(), rationale, ALSO_CONSIDERED, Candidate (+24 more)

### Community 40 - "group/page.tsx"
Cohesion: 0.12
Nodes (33): AccountPage(), Section(), Stats, GroupPage(), SectionHeader(), AvatarUser, DUCKS, findAddress() (+25 more)

### Community 41 - "schemas.ts"
Cohesion: 0.22
Nodes (12): AgentContext, contextSchema, findOpenFlocksInput, lat, lng, processFeedbackInput, rankApartmentsInput, searchApartmentsInput (+4 more)

### Community 42 - "vexcel.ts"
Cohesion: 0.13
Nodes (19): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+11 more)

### Community 43 - "agent.test.ts"
Cohesion: 0.22
Nodes (9): cfg(), FLOCK, P(), plan(), seed(), U(), threadId(), @langchain/langgraph@^1.7.4 (+1 more)

### Community 44 - "MapFiltersSheet.tsx"
Cohesion: 0.15
Nodes (18): Ducktective(), LOOP, applyFilters(), BATHS, BEDS, FiltersBody(), Heading(), MapFiltersSheet() (+10 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 48 - "SessionGate.tsx"
Cohesion: 0.16
Nodes (15): gaegu, metadata, RootLayout(), viewport, BottomNav(), MotionProvider(), AUTH_PAGES, NO_FLOCK_OK() (+7 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 50 - "ducktect-split.ts"
Cohesion: 0.12
Nodes (24): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+16 more)

### Community 51 - "ducktect-run.ts"
Cohesion: 0.15
Nodes (21): maxDuration, POST(), newSession(), conciseSummary(), AERIAL_CALLS, AGENT_DEADLINE_MS, DAILY_LIMIT, startDucktect() (+13 more)

### Community 52 - "next"
Cohesion: 0.24
Nodes (12): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), AuthHeader(), Button(), Field() (+4 more)

### Community 53 - "Avatar"
Cohesion: 0.30
Nodes (11): summary(), YourFlocksPage(), load(), MembersPage(), Avatar(), ProposalCard(), answer(), getMyFlocks() (+3 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "getGroupMembers"
Cohesion: 0.26
Nodes (10): ComparePickPage(), Source, SOURCES, InvitePage(), NavBar(), FLOCK_NAME, getStash(), getTouredListingIds() (+2 more)

### Community 57 - "api.ts"
Cohesion: 0.15
Nodes (27): TourDetailPage(), rsvp(), BookTourSheet(), MessageSheet(), Thread(), send(), DucktectPick, cancelTour() (+19 more)

### Community 58 - "picks/page.tsx"
Cohesion: 0.22
Nodes (15): toggleLike(), badge(), FlockPicksPage(), toggleLike(), Pick, Sort, toPicks(), PickCard() (+7 more)

### Community 59 - "Flock"
Cohesion: 0.20
Nodes (9): CoStar listings (ticket T3), Database, Deploy on Vercel, Flock, Flocks (ticket T6), Galleries (ticket T5), Getting Started, Learn More (+1 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.24
Nodes (9): anon, at(), check(), dead, LA, opts, st, store (+1 more)

### Community 61 - "flocks/[id]/page.tsx"
Cohesion: 0.23
Nodes (12): FlockProfilePage(), join(), RESULT, open(), JoinPage(), authFetch(), DiscoveredFlock, discoverFlocks() (+4 more)

### Community 62 - "subagents.test.ts"
Cohesion: 0.20
Nodes (11): Plan, cfg, collect(), FLOCK, members, P(), plan(), plans() (+3 more)

### Community 63 - "find/page.tsx"
Cohesion: 0.22
Nodes (12): FindFlockPage(), FIT, FIT_RANK, hasBasics(), hasStory(), nextStep(), Reading, Sort (+4 more)

### Community 64 - "ducktect-notes.ts"
Cohesion: 0.23
Nodes (10): DucktectResult, Note, notesFor(), plural(), readingLines(), around, base(), interpreted() (+2 more)

### Community 65 - "flocks.ts"
Cohesion: 0.24
Nodes (9): POST(), source(), BEDROOMS, BUDGETS, CreateFlock, isObj(), LA_AREAS, parseCreateFlock() (+1 more)

### Community 67 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.18
Nodes (10): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface (+2 more)

### Community 68 - "test-pins.mjs"
Cohesion: 0.20
Nodes (7): admin, flocks, opts, people, pinA, st, tag

### Community 69 - "groupMatch"
Cohesion: 0.31
Nodes (9): 3.1 Gaps between today and the goal, 3. Current state (read from the code), 5.1 Property data (from the CoStar kit), 5.2 Media and enrichment, 5.3 People, flocks, decisions, 5.4 Row-level security (sketch), 5. Data model, groupMatch() (+1 more)

### Community 70 - "EndOfDeck.tsx"
Cohesion: 0.43
Nodes (6): ForYouPage(), Direction, EndOfDeck(), Pile(), getMySwipes(), getSwipeDeck()

### Community 71 - "vexcel.test.ts"
Cohesion: 0.29
Nodes (4): canonicalPhrase(), normalizePhrase(), squareWkt(), checkable

### Community 72 - "proxy.ts"
Cohesion: 0.33
Nodes (5): 4.1 Target folder layout, 4. Target architecture, AUTH_PAGES, config, proxy()

### Community 73 - "6. Data sources"
Cohesion: 0.40
Nodes (5): 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**, 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**, 6.3 Vexcel — aerial evidence and prose search **[planned]**, 6.4 Out of scope, 6. Data sources

### Community 74 - "7. Matching and scoring (pure code, `lib/match/`)"
Cohesion: 0.40
Nodes (5): 7.1 Units and the feasibility rule (settled), 7.2 Listing fit (hard constraints, then score), 7.3 Voting and the flock score, 7.4 Roommate compatibility, open-flock joining, privacy, 7. Matching and scoring (pure code, `lib/match/`)

### Community 75 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 455 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `ducktect-run.ts` to `requireUser`, `ingest-places.ts`, `package.json`, `CoStar Data Ingest`, `store.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `places.ts`, `discover.ts`, `demo-agent.mjs`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `test-ducktect-api.mjs`, `test-places.mjs`, `test-pins.mjs`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Sheet`, `package.json`, `map/page.tsx`, `compare/page.tsx`, `new/page.tsx`, `format.ts`, `BookTourSheet.tsx`, `ListingReel.tsx`, `group/page.tsx`, `MapFiltersSheet.tsx`, `SessionGate.tsx`, `next`, `Avatar`, `getGroupMembers`, `api.ts`, `picks/page.tsx`, `flocks/[id]/page.tsx`, `find/page.tsx`, `EndOfDeck.tsx`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.057971014492753624 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `Sheet`, `package.json`, `map/page.tsx`, `compare/page.tsx`, `group/page.tsx`, `new/page.tsx`, `proxy.ts`, `SessionGate.tsx`, `BookTourSheet.tsx`, `Avatar`, `format.ts`, `getGroupMembers`, `api.ts`, `picks/page.tsx`, `flocks/[id]/page.tsx`, `ListingReel.tsx`, `find/page.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `map/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._