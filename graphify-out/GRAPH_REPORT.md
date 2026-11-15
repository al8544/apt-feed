# Graph Report - apt-feed  (2026-11-15)

## Corpus Check
- 199 files · ~131,491 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1421 nodes · 3475 edges · 69 communities (65 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f203b995`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compare/page.tsx
- places.ts
- ingest-places.ts
- package.json
- requireUser
- Product Concept & Agents
- react
- CoStar Data Ingest
- matcher.ts
- index.ts
- TypeScript Config
- Map Data Model
- Supabase Security & Schema
- ingest-costar-media.ts
- Listing Cards Schema
- Icon Components
- Agent Rules Docs
- enrich-apartments-com.ts
- picks/page.tsx
- Local test database
- ref_node_assert
- Apartments.com enrichment: permission record
- AGENTS.md
- format.ts
- edit-demo.mjs
- BookTourSheet.tsx
- FlockChatSheet.tsx
- ducktect-testkit.ts
- listing-fit.ts
- api.ts
- ducktect-split.ts
- ducktect.ts
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- 8. The agent (LangChain Deep Agents)
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect-agent.test.ts
- requests/page.tsx
- Flock demo video: script
- SessionGate.tsx
- vexcel.test.ts
- find/page.tsx
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- schemas.ts
- test-aerial.mjs
- Flock — End-Goal Design & Implementation Guide
- groupMatch
- test-pins.mjs
- group/page.tsx
- AerialStore
- test-ducktect-api.mjs
- next
- map/page.tsx
- demo-agent.mjs
- proxy.ts
- test-places.mjs
- seed-demo.mjs
- subagents.test.ts
- 6. Data sources
- 7. Matching and scoring (pure code, `lib/match/`)
- vexcel.ts
- bootstrap.sh
- 2. Product scope
- ducktect-agent.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 49 edges
2. `check()` - 41 edges
3. `next` - 37 edges
4. `Avatar()` - 34 edges
5. `money()` - 34 edges
6. `GroupPage()` - 30 edges
7. `Sheet()` - 26 edges
8. `area()` - 25 edges
9. `Button()` - 24 edges
10. `@supabase/supabase-js` - 24 edges

## Surprising Connections (you probably didn't know these)
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `7.2 Listing fit (hard constraints, then score)` --references--> `groupMatch()`  [INFERRED]
  docs/DESIGN.md → lib/api.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (69 total, 4 thin omitted)

### Community 0 - "compare/page.tsx"
Cohesion: 0.11
Nodes (33): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+25 more)

### Community 1 - "places.ts"
Cohesion: 0.14
Nodes (20): Around, away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE (+12 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (39): eslintConfig, react-dom@19.3.0, @supabase/ssr@^0.12.7, devDependencies, eslint@^9, eslint-config-next@16.4.6, playwright-core@^1.65.1, supabase@^3.1.0 (+31 more)

### Community 4 - "requireUser"
Cohesion: 0.11
Nodes (28): POST(), maxDuration, POST(), maxDuration, POST(), maxDuration, POST(), POST() (+20 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.07
Nodes (26): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, Flock Deep Agent (deepagents), Two-minute demo, Ducktect best option, Flock product (end-goal design) (+18 more)

### Community 6 - "react"
Cohesion: 0.09
Nodes (24): dist(), MapListingPage(), ForYouPage(), BottomNav(), TABS, Direction, EndOfDeck(), Pile() (+16 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.08
Nodes (20): CoStar data kit, CoStar track (Inside and Out), CoStar ingest run (ticket T3), after, args, before, communities, counts (+12 more)

### Community 8 - "matcher.ts"
Cohesion: 0.07
Nodes (38): GET(), GET(), DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt() (+30 more)

### Community 9 - "index.ts"
Cohesion: 0.17
Nodes (7): explain(), rerunShortlist(), AgentStore, ctxOf(), fact(), json(), makeTools()

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

### Community 18 - "picks/page.tsx"
Cohesion: 0.21
Nodes (15): toggleLike(), badge(), FlockPicksPage(), toggleLike(), Pick, Sort, toPicks(), toggle() (+7 more)

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "ref_node_assert"
Cohesion: 0.22
Nodes (6): far, photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.22
Nodes (21): ListingDetailPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), SwipeCard(), fling(), onDragEnd() (+13 more)

### Community 24 - "edit-demo.mjs"
Cohesion: 0.06
Nodes (46): OUTRO, SCENES, TITLE, camera(), cameraPath(), card(), css(), data (+38 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.14
Nodes (30): TourDetailPage(), rsvp(), addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), AGENTS (+22 more)

### Community 26 - "FlockChatSheet.tsx"
Cohesion: 0.36
Nodes (8): Chat(), send(), FlockChatSheet(), FlockMessage, getFlockMessages(), sendFlockMessage(), subscribeToFlockMessages(), lucide-react

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.13
Nodes (20): fixture(), DucktectEnv, MAX_PLACES, SHORTLIST, RawInterpretation, climb, HARD, quietNights (+12 more)

### Community 28 - "listing-fit.ts"
Cohesion: 0.09
Nodes (35): isReason(), Outcome, Reason, Refresh, Rejection, ruledOut(), stillCounts(), CandidateQuery (+27 more)

### Community 29 - "api.ts"
Cohesion: 0.10
Nodes (39): summary(), YourFlocksPage(), load(), open(), JoinPage(), MessageSheet(), Thread(), send() (+31 more)

### Community 30 - "ducktect-split.ts"
Cohesion: 0.11
Nodes (24): AREA_CENTERS, areaByName(), areaViewport(), bedsOf(), Check, clip(), dedupe(), Hard (+16 more)

### Community 31 - "ducktect.ts"
Cohesion: 0.11
Nodes (35): createDucktectAgent(), makeDucktectTools(), ALSO_CONSIDERED, Candidate, confirmWithSatellite(), Constraint, explain(), explainNothing() (+27 more)

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

### Community 39 - "ducktect-agent.test.ts"
Cohesion: 0.17
Nodes (12): collect(), DUCKTECT_TOOL_NAMES, cfg, collect(), INTERPRETED, newSession(), clip(), kind() (+4 more)

### Community 40 - "requests/page.tsx"
Cohesion: 0.36
Nodes (8): Card(), RequestsPage(), answer(), RESULT, answerJoinRequest(), getJoinRequests(), JoinRequest, timeAgo()

### Community 41 - "Flock demo video: script"
Cohesion: 0.17
Nodes (11): 1. The problem · 0:00 to 0:16 (16s), 2. The idea · 0:16 to 0:24 (8s), 3. Home: your group's ranked list · 0:24 to 0:38 (14s), 4. Scroll to find new places · 0:38 to 0:50 (12s), 5. Or use the map · 0:50 to 0:59 (9s), 6. Ducktective · 0:59 to 1:15 (16s), 7. Tours on a shared calendar · 1:15 to 1:27 (12s), 8. Compare, like PC specs · 1:27 to 1:42 (15s) (+3 more)

### Community 42 - "SessionGate.tsx"
Cohesion: 0.22
Nodes (10): gaegu, metadata, RootLayout(), viewport, MotionProvider(), AUTH_PAGES, NO_FLOCK_OK(), SessionGate() (+2 more)

### Community 43 - "vexcel.test.ts"
Cohesion: 0.22
Nodes (5): canonicalPhrase(), createVexcel(), normalizePhrase(), squareWkt(), checkable

### Community 44 - "find/page.tsx"
Cohesion: 0.07
Nodes (58): POST(), SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save() (+50 more)

### Community 45 - "ref_node_child_process"
Cohesion: 0.20
Nodes (5): dev, r, env, r, [zip, password]

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.16
Nodes (16): aerialEvidence(), Community, DEFAULT_BUFFER_M, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable(), QueryRow (+8 more)

### Community 48 - "schemas.ts"
Cohesion: 0.27
Nodes (10): AgentContext, contextSchema, findOpenFlocksInput, lat, lng, processFeedbackInput, rankApartmentsInput, searchApartmentsInput (+2 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.15
Nodes (11): supabaseAerialStore(), admin, anon, C, community, imagery, must(), opts (+3 more)

### Community 50 - "Flock — End-Goal Design & Implementation Guide"
Cohesion: 0.20
Nodes (9): 10. Auth, consent, security, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface, Appendix: environment variables (+1 more)

### Community 51 - "groupMatch"
Cohesion: 0.31
Nodes (9): 3.1 Gaps between today and the goal, 3. Current state (read from the code), 5.1 Property data (from the CoStar kit), 5.2 Media and enrichment, 5.3 People, flocks, decisions, 5.4 Row-level security (sketch), 5. Data model, groupMatch() (+1 more)

### Community 52 - "test-pins.mjs"
Cohesion: 0.20
Nodes (7): admin, flocks, opts, people, pinA, st, tag

### Community 53 - "group/page.tsx"
Cohesion: 0.09
Nodes (45): AccountPage(), Section(), Stats, GroupPage(), SectionHeader(), Avatar(), AvatarUser, DUCKS (+37 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "next"
Cohesion: 0.16
Nodes (17): ComparePickPage(), Source, SOURCES, MembersPage(), StashPage(), NavBar(), seen(), seenKey() (+9 more)

### Community 57 - "map/page.tsx"
Cohesion: 0.05
Nodes (58): CENTER, CHIPS, ClusterMarker(), DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect() (+50 more)

### Community 58 - "demo-agent.mjs"
Cohesion: 0.19
Nodes (9): readEvents(), admin, flock, opts, people, post(), st, tag (+1 more)

### Community 59 - "proxy.ts"
Cohesion: 0.33
Nodes (5): 4.1 Target folder layout, 4. Target architecture, AUTH_PAGES, config, proxy()

### Community 60 - "test-places.mjs"
Cohesion: 0.22
Nodes (10): supabasePlaceStore(), anon, at(), check(), dead, LA, opts, st (+2 more)

### Community 61 - "seed-demo.mjs"
Cohesion: 0.50
Nodes (3): files, r, SCENARIOS

### Community 62 - "subagents.test.ts"
Cohesion: 0.22
Nodes (10): feedbackInput, cfg, FLOCK, members, P(), plan(), plans(), seed() (+2 more)

### Community 63 - "6. Data sources"
Cohesion: 0.40
Nodes (5): 6.1 CoStar data kit — primary source **[built: T3, verified on a local database]**, 6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**, 6.3 Vexcel — aerial evidence and prose search **[planned]**, 6.4 Out of scope, 6. Data sources

### Community 64 - "7. Matching and scoring (pure code, `lib/match/`)"
Cohesion: 0.40
Nodes (5): 7.1 Units and the feasibility rule (settled), 7.2 Listing fit (hard constraints, then score), 7.3 Voting and the flock score, 7.4 Roommate compatibility, open-flock joining, privacy, 7. Matching and scoring (pure code, `lib/match/`)

### Community 65 - "vexcel.ts"
Cohesion: 0.14
Nodes (18): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+10 more)

### Community 66 - "bootstrap.sh"
Cohesion: 1.00
Nodes (3): have(), node_ok(), bootstrap.sh script

### Community 67 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

### Community 69 - "ducktect-agent.ts"
Cohesion: 0.05
Nodes (51): cfg(), FLOCK, P(), plan(), seed(), U(), ducktectModel(), interpretation (+43 more)

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 503 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `requireUser` to `places.ts`, `ingest-places.ts`, `package.json`, `CoStar Data Ingest`, `matcher.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `listing-fit.ts`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `test-pins.mjs`, `test-ducktect-api.mjs`, `demo-agent.mjs`, `test-places.mjs`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compare/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `compare/page.tsx`, `package.json`, `ducktect-agent.ts`, `requests/page.tsx`, `SessionGate.tsx`, `find/page.tsx`, `picks/page.tsx`, `group/page.tsx`, `format.ts`, `next`, `map/page.tsx`, `FlockChatSheet.tsx`, `api.ts`, `BookTourSheet.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14333333333333334 - nodes in this community are weakly interconnected._
- **Why does `Ducktect best option` connect `Product Concept & Agents` to `map/page.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._