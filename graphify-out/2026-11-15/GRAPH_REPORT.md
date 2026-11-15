# Graph Report - apt-feed  (2026-11-15)

## Corpus Check
- 195 files · ~129,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1395 nodes · 3436 edges · 64 communities (59 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f69bdf9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compare/page.tsx
- react
- ingest-places.ts
- package.json
- requireUser
- Product Concept & Agents
- ListingReel.tsx
- CoStar Data Ingest
- matcher.ts
- feedback.ts
- TypeScript Config
- Map Data Model
- Supabase Security & Schema
- ingest-costar-media.ts
- Listing Cards Schema
- Icon Components
- Agent Rules Docs
- enrich-apartments-com.ts
- react
- Local test database
- ref_node_assert
- Apartments.com enrichment: permission record
- AGENTS.md
- format.ts
- edit-demo.mjs
- BookTourSheet.tsx
- FlockChatSheet.tsx
- ducktect-testkit.ts
- smoke-agent.ts
- api.ts
- ducktect-split.ts
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- Flock — End-Goal Design & Implementation Guide
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect.ts
- group/page.tsx
- 2. Product scope
- find/page.tsx
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- test-aerial.mjs
- test-pins.mjs
- account/page.tsx
- AerialStore
- test-ducktect-api.mjs
- next
- map/page.tsx
- demo-agent.mjs
- picks/page.tsx
- test-places.mjs
- seed-demo.mjs
- subagents.test.ts
- vexcel.ts
- 8. The agent (LangChain Deep Agents)
- prompts.ts
- groupMatch
- proxy.ts
- 6. Data sources
- 7. Matching and scoring (pure code, `lib/match/`)

## God Nodes (most connected - your core abstractions)
1. `react` - 49 edges
2. `check()` - 41 edges
3. `next` - 37 edges
4. `Avatar()` - 34 edges
5. `money()` - 34 edges
6. `GroupPage()` - 28 edges
7. `area()` - 25 edges
8. `Sheet()` - 25 edges
9. `Button()` - 24 edges
10. `@supabase/supabase-js` - 24 edges

## Surprising Connections (you probably didn't know these)
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `3. Current state (read from the code)` --references--> `flockScore()`  [INFERRED]
  docs/DESIGN.md → lib/compare.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (64 total, 5 thin omitted)

### Community 0 - "compare/page.tsx"
Cohesion: 0.10
Nodes (35): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+27 more)

### Community 1 - "react"
Cohesion: 0.19
Nodes (17): summary(), YourFlocksPage(), load(), open(), JoinPage(), Avatar(), AvatarUser, DUCKS (+9 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (48): eslintConfig, dependencies, framer-motion@^14.14.0, langchain@^1.6.6, @langchain/core@^1.4.1, @langchain/langgraph@^1.7.4, @langchain/openai@^1.8.4, lucide-react@^1.72.0 (+40 more)

### Community 4 - "requireUser"
Cohesion: 0.13
Nodes (23): POST(), maxDuration, POST(), maxDuration, POST(), maxDuration, POST(), POST() (+15 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.06
Nodes (29): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, CoStar data kit, CoStar track (Inside and Out), Flock Deep Agent (deepagents), Two-minute demo (+21 more)

### Community 6 - "ListingReel.tsx"
Cohesion: 0.07
Nodes (43): gaegu, metadata, RootLayout(), viewport, toggleLike(), dist(), MapListingPage(), toggleLike() (+35 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.09
Nodes (17): after, args, before, communities, counts, db, flag(), idByProperty (+9 more)

### Community 8 - "matcher.ts"
Cohesion: 0.12
Nodes (20): DAILY_LIMIT, maxDuration, POST(), DEFAULT_MODEL, inventedNumbers(), norm(), Analyze, analyzeFlocks() (+12 more)

### Community 9 - "feedback.ts"
Cohesion: 0.05
Nodes (54): GET(), GET(), explain(), isReason(), Outcome, Reason, Refresh, Rejection (+46 more)

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
Cohesion: 0.17
Nodes (8): Parsed, args, db, flag(), opt(), overrides, Result, results

### Community 18 - "react"
Cohesion: 0.14
Nodes (6): InvitePage(), FLOCK_NAME, GROUP_ID, inviteFriends(), inviteLink(), react

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "ref_node_assert"
Cohesion: 0.33
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.21
Nodes (22): ListingDetailPage(), StashPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), SwipeCard(), fling() (+14 more)

### Community 24 - "edit-demo.mjs"
Cohesion: 0.06
Nodes (46): OUTRO, SCENES, TITLE, camera(), cameraPath(), card(), css(), data (+38 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.15
Nodes (28): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), AGENTS, BookTourSheet(), busyMembers() (+20 more)

### Community 26 - "FlockChatSheet.tsx"
Cohesion: 0.24
Nodes (11): Chat(), send(), FlockChatSheet(), UserSwitcher(), CURRENT_USER_ID, FlockMessage, getFlockMessages(), sendFlockMessage() (+3 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.11
Nodes (24): DUCKTECT_TOOL_NAMES, cfg, fixture(), INTERPRETED, COM(), fakeVexcel(), lat(), needs() (+16 more)

### Community 28 - "smoke-agent.ts"
Cohesion: 0.20
Nodes (9): @langchain/core, agent, contextSchema, echo, fake, last, ping, sawTool (+1 more)

### Community 29 - "api.ts"
Cohesion: 0.14
Nodes (27): ComparePickPage(), Source, SOURCES, MessageSheet(), Thread(), send(), check(), decorate() (+19 more)

### Community 30 - "ducktect-split.ts"
Cohesion: 0.06
Nodes (48): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+40 more)

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
Cohesion: 0.08
Nodes (48): createDucktectAgent(), ducktectModel(), interpretation, json(), makeDucktectTools(), rationale, ALSO_CONSIDERED, Candidate (+40 more)

### Community 40 - "group/page.tsx"
Cohesion: 0.15
Nodes (23): GroupPage(), SectionHeader(), Fit(), FlockPinsMap(), LA, Details(), HABIT_LABEL, MemberSheet() (+15 more)

### Community 43 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

### Community 44 - "find/page.tsx"
Cohesion: 0.08
Nodes (54): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save(), FindFlockPage() (+46 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.10
Nodes (21): DEFAULT_BUFFER_M, canonicalPhrase(), normalizePhrase(), args, budget, buffer, C, checkable (+13 more)

### Community 47 - "aerial.ts"
Cohesion: 0.16
Nodes (16): aerialEvidence(), Community, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable(), QueryRow (+8 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 52 - "test-pins.mjs"
Cohesion: 0.20
Nodes (7): admin, flocks, opts, people, pinA, st, tag

### Community 53 - "account/page.tsx"
Cohesion: 0.19
Nodes (17): AccountPage(), Section(), Stats, findAddress(), LA, PanTo(), PinSheet(), save() (+9 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "next"
Cohesion: 0.21
Nodes (11): MembersPage(), TourDetailPage(), rsvp(), NavBar(), cancelTour(), changed(), getTour(), joinTour() (+3 more)

### Community 57 - "map/page.tsx"
Cohesion: 0.05
Nodes (55): CENTER, CHIPS, ClusterMarker(), DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect() (+47 more)

### Community 58 - "demo-agent.mjs"
Cohesion: 0.20
Nodes (8): admin, flock, opts, people, post(), st, tag, turn()

### Community 59 - "picks/page.tsx"
Cohesion: 0.19
Nodes (14): badge(), FlockPicksPage(), Pick, Sort, toPicks(), Card(), RequestsPage(), answer() (+6 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.22
Nodes (10): @supabase/supabase-js, anon, at(), check(), dead, LA, opts, st (+2 more)

### Community 61 - "seed-demo.mjs"
Cohesion: 0.50
Nodes (3): files, r, SCENARIOS

### Community 62 - "subagents.test.ts"
Cohesion: 0.09
Nodes (28): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), readEvents() (+20 more)

### Community 65 - "vexcel.ts"
Cohesion: 0.11
Nodes (20): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+12 more)

### Community 68 - "8. The agent (LangChain Deep Agents)"
Cohesion: 0.18
Nodes (11): 8.10 LangChain track checklist, 8.1 How we use each Deep Agents capability, 8.2 Topology, 8.3 Tools (LangChain `tool()` + zod), 8.4 Safety rules, 8.5 Runtime sketch, 8.6 Runtime notes and risks **[verify]**, 8.7 Memory (+3 more)

### Community 69 - "prompts.ts"
Cohesion: 0.11
Nodes (26): checkpointer, DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT, DUCKTECT_SCOUT_PROMPT, FLOCK_PROMPT, MATCHER_PROMPT, MATCHER_SUBAGENT_PROMPT, SEARCHER_PROMPT (+18 more)

### Community 73 - "groupMatch"
Cohesion: 0.31
Nodes (9): 3.1 Gaps between today and the goal, 3. Current state (read from the code), 5.1 Property data (from the CoStar kit), 5.2 Media and enrichment, 5.3 People, flocks, decisions, 5.4 Row-level security (sketch), 5. Data model, groupMatch() (+1 more)

### Community 74 - "proxy.ts"
Cohesion: 0.33
Nodes (5): 4.1 Target folder layout, 4. Target architecture, AUTH_PAGES, config, proxy()

### Community 75 - "6. Data sources"
Cohesion: 0.40
Nodes (5): 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**, 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**, 6.3 Vexcel — aerial evidence and prose search **[planned]**, 6.4 Out of scope, 6. Data sources

### Community 76 - "7. Matching and scoring (pure code, `lib/match/`)"
Cohesion: 0.40
Nodes (5): 7.1 Units and the feasibility rule (settled), 7.2 Listing fit (hard constraints, then score), 7.3 Voting and the flock score, 7.4 Roommate compatibility, open-flock joining, privacy, 7. Matching and scoring (pure code, `lib/match/`)

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 485 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-places.mjs` to `ingest-places.ts`, `package.json`, `requireUser`, `CoStar Data Ingest`, `feedback.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `ducktect-testkit.ts`, `ducktect-split.ts`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `ducktect.ts`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `test-pins.mjs`, `test-ducktect-api.mjs`, `demo-agent.mjs`?**
  _High betweenness centrality (0.206) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compare/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `compare/page.tsx`, `react`, `package.json`, `ListingReel.tsx`, `group/page.tsx`, `proxy.ts`, `find/page.tsx`, `account/page.tsx`, `format.ts`, `BookTourSheet.tsx`, `picks/page.tsx`, `api.ts`, `map/page.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `flockScore()` connect `compare/page.tsx` to `group/page.tsx`, `groupMatch`, `7. Matching and scoring (pure code, `lib/match/`)`, `api.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05142857142857143 - nodes in this community are weakly interconnected._