# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 172 files · ~111,136 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1224 nodes · 2955 edges · 70 communities (66 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a71d40c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- @supabase/supabase-js
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
- api.ts
- vexcel.ts
- agent.test.ts
- dependencies
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- SessionGate.tsx
- test-aerial.mjs
- ducktect-split.ts
- ducktect-run.ts
- smoke-agent.ts
- flocks/page.tsx
- AerialStore
- test-ducktect-api.mjs
- getGroupMembers
- new/page.tsx
- Button
- picks/page.tsx
- test-places.mjs
- scripts
- Flock — End-Goal Design & Implementation Guide
- updatePreferences
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
10. `GroupPage()` - 21 edges

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

## Communities (70 total, 4 thin omitted)

### Community 0 - "react"
Cohesion: 0.11
Nodes (16): MembersPage(), TourDetailPage(), rsvp(), Avatar(), AvatarUser, DUCKS, Sheet(), UserSwitcher() (+8 more)

### Community 1 - "@supabase/supabase-js"
Cohesion: 0.23
Nodes (9): maxDuration, POST(), GET(), POST(), POST(), ducktectInput, Caller, requireUser() (+1 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "Package Dependencies & Lint"
Cohesion: 0.12
Nodes (21): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, @types/node@^20, @types/react@^19 (+13 more)

### Community 4 - "map/page.tsx"
Cohesion: 0.05
Nodes (61): summary(), CENTER, CHIPS, DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect() (+53 more)

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
Cohesion: 0.13
Nodes (25): Basics(), save(), FindFlockPage(), FIT, FIT_RANK, hasBasics(), hasStory(), nextStep() (+17 more)

### Community 9 - "store.ts"
Cohesion: 0.06
Nodes (48): contextSchema, searchApartmentsInput, sendInvitesInput, AgentStore, ctxOf(), explain(), fact(), json() (+40 more)

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
Cohesion: 0.12
Nodes (23): Around, away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE (+15 more)

### Community 19 - "Local test database"
Cohesion: 0.18
Nodes (10): Check row-level security, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop, Test the agent (+2 more)

### Community 20 - "media.ts"
Cohesion: 0.39
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.19
Nodes (19): StashPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), SwipeCard(), fling(), onDragEnd() (+11 more)

### Community 24 - "run.ts"
Cohesion: 0.15
Nodes (16): maxDuration, POST(), maxDuration, POST(), createFlockAgent(), AgentHttpError, DAILY_LIMIT, startAgent() (+8 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.17
Nodes (22): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), AGENTS, BookTourSheet(), busyMembers() (+14 more)

### Community 26 - "flock-agent.ts"
Cohesion: 0.14
Nodes (18): interpretation, json(), rationale, DucktectSession, checkpointer, DEFAULT_MODEL, DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT (+10 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.14
Nodes (20): fixture(), DucktectEnv, COM(), fakeVexcel(), lat(), needs(), plan, setup() (+12 more)

### Community 28 - "agent.test.ts"
Cohesion: 0.21
Nodes (10): DUCKTECT_TOOL_NAMES, cfg, collect(), INTERPRETED, AgentEvent, clip(), kind(), Msg (+2 more)

### Community 29 - "matcher.ts"
Cohesion: 0.16
Nodes (15): DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt(), Candidate, clean() (+7 more)

### Community 30 - "ListingReel.tsx"
Cohesion: 0.19
Nodes (16): dist(), MapListingPage(), ForYouPage(), TABS, Direction, EndOfDeck(), Pile(), Icon() (+8 more)

### Community 31 - "demo-agent.mjs"
Cohesion: 0.17
Nodes (11): readEvents(), inventedNumbers(), norm(), admin, flock, opts, people, post() (+3 more)

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
Cohesion: 0.35
Nodes (9): asArray(), httpsUrl(), imageUrls(), isBlocked(), isObj(), Json, jsonLdNodes(), MediaItem (+1 more)

### Community 39 - "ducktect.ts"
Cohesion: 0.11
Nodes (32): makeDucktectTools(), ALSO_CONSIDERED, Candidate, confirmWithSatellite(), Constraint, explain(), explainNothing(), extraBeds() (+24 more)

### Community 40 - "group/page.tsx"
Cohesion: 0.17
Nodes (21): ComparePickPage(), Source, SOURCES, GroupPage(), SectionHeader(), RankingRow(), SettingsRow(), seen() (+13 more)

### Community 41 - "api.ts"
Cohesion: 0.14
Nodes (28): AccountPage(), Section(), Stats, MessageSheet(), Thread(), send(), check(), decorate() (+20 more)

### Community 42 - "vexcel.ts"
Cohesion: 0.13
Nodes (19): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+11 more)

### Community 43 - "agent.test.ts"
Cohesion: 0.22
Nodes (9): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), threadId() (+1 more)

### Community 44 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, framer-motion@^14.14.0, @langchain/openai@^1.8.4, lucide-react@^1.72.0, next@16.4.6, react@19.3.0, react-dom@19.3.0, @supabase/ssr@^0.12.7 (+5 more)

### Community 45 - "ref_node_child_process"
Cohesion: 0.25
Nodes (4): dev, r, r, sql

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 48 - "SessionGate.tsx"
Cohesion: 0.21
Nodes (11): gaegu, metadata, RootLayout(), viewport, BottomNav(), MotionProvider(), AUTH_PAGES, NO_FLOCK_OK() (+3 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 50 - "ducktect-split.ts"
Cohesion: 0.12
Nodes (24): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+16 more)

### Community 51 - "ducktect-run.ts"
Cohesion: 0.21
Nodes (13): createDucktectAgent(), ducktectModel(), newSession(), AERIAL_CALLS, AGENT_DEADLINE_MS, DAILY_LIMIT, startDucktect(), source() (+5 more)

### Community 52 - "smoke-agent.ts"
Cohesion: 0.15
Nodes (12): deepagents@^1.16.5, zod@^4.6.7, deepagents, zod, agent, contextSchema, echo, fake (+4 more)

### Community 53 - "flocks/page.tsx"
Cohesion: 0.22
Nodes (14): summary(), YourFlocksPage(), load(), open(), JoinPage(), ProposalCard(), answer(), FlockSummary (+6 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "getGroupMembers"
Cohesion: 0.62
Nodes (4): InvitePage(), NavBar(), inviteFriends(), inviteLink()

### Community 57 - "new/page.tsx"
Cohesion: 0.19
Nodes (14): POST(), NewFlockForm(), create(), NewFlockPage(), Step, TypeCard(), createFlock(), BEDROOMS (+6 more)

### Community 58 - "Button"
Cohesion: 0.35
Nodes (10): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), AuthHeader(), Button(), Field() (+2 more)

### Community 59 - "picks/page.tsx"
Cohesion: 0.26
Nodes (14): ListingDetailPage(), toggleStash(), badge(), FlockPicksPage(), toggleStash(), Pick, Sort, toPicks() (+6 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.24
Nodes (9): anon, at(), check(), dead, LA, opts, st, store (+1 more)

### Community 61 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:seed, dev, dev:local, lint, start

### Community 62 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.18
Nodes (10): 10. Auth, consent, security, 11. Realtime, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface (+2 more)

### Community 63 - "updatePreferences"
Cohesion: 0.39
Nodes (7): Story(), save(), PreferencesSheet(), Prefs, PrefsForm(), save(), updatePreferences()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 435 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `@supabase/supabase-js` to `ingest-places.ts`, `Package Dependencies & Lint`, `CoStar Data Ingest`, `store.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `places.ts`, `run.ts`, `ducktect-testkit.ts`, `demo-agent.mjs`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `dependencies`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `ducktect-run.ts`, `test-ducktect-api.mjs`, `test-places.mjs`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.11397849462365592 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `Package Dependencies & Lint`, `map/page.tsx`, `compare/page.tsx`, `group/page.tsx`, `api.ts`, `find/page.tsx`, `dependencies`, `SessionGate.tsx`, `BookTourSheet.tsx`, `flocks/page.tsx`, `format.ts`, `getGroupMembers`, `new/page.tsx`, `Button`, `picks/page.tsx`, `ListingReel.tsx`, `updatePreferences`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `Ducktect best option` connect `Product Concept & Agents` to `map/page.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Package Dependencies & Lint` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._