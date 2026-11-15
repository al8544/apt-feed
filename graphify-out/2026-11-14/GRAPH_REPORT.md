# Graph Report - apt-feed  (2026-11-14)

## Corpus Check
- 194 files · ~128,129 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1381 nodes · 3400 edges · 74 communities (69 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.87)
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
- ref_node_assert
- Apartments.com enrichment: permission record
- AGENTS.md
- format.ts
- edit-demo.mjs
- BookTourSheet.tsx
- subagents.test.ts
- ducktect-testkit.ts
- smoke-agent.ts
- api.ts
- places.ts
- ducktect-agent.ts
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- Flock — End-Goal Design & Implementation Guide
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect.ts
- group/page.tsx
- SmallerFlockPrompt.tsx
- eslint.config.mjs
- 2. Product scope
- find/page.tsx
- ref_node_child_process
- enrich-vexcel.ts
- aerial.ts
- rerunShortlist
- test-aerial.mjs
- dependencies
- ducktect-run.ts
- test-pins.mjs
- account/page.tsx
- AerialStore
- test-ducktect-api.mjs
- next
- map/page.tsx
- demo-agent.mjs
- listing/[id]/page.tsx
- test-places.mjs
- seed-demo.mjs
- subagents.test.ts
- tours/[id]/page.tsx
- vexcel.test.ts
- vexcel.ts
- 8. The agent (LangChain Deep Agents)
- prompts.ts
- groupMatch
- proxy.ts
- 6. Data sources
- 7. Matching and scoring (pure code, `lib/match/`)
- record-demo.mjs
- scripts

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
- `7.4 Roommate compatibility, open-flock joining, privacy` --references--> `compat()`  [INFERRED]
  docs/DESIGN.md → lib/match/compat.ts
- `10. Auth, consent, security` --references--> `requireUser()`  [INFERRED]
  docs/DESIGN.md → lib/server/auth.ts
- `6.2 Apartments.com images and details — enrichment **[built, deliberately unused]**` --references--> `parse()`  [INFERRED]
  docs/DESIGN.md → lib/enrich/apartments-com.ts
- `8.9 Ducktect best option (search bar)` --references--> `matchesQuery()`  [INFERRED]
  docs/DESIGN.md → components/MapFiltersSheet.tsx
- `3. Current state (read from the code)` --references--> `flockScore()`  [INFERRED]
  docs/DESIGN.md → lib/compare.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (74 total, 5 thin omitted)

### Community 0 - "compare/page.tsx"
Cohesion: 0.10
Nodes (36): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+28 more)

### Community 1 - "react"
Cohesion: 0.20
Nodes (15): summary(), YourFlocksPage(), load(), open(), AvatarUser, DUCKS, ProposalCard(), answer() (+7 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, playwright-core@^1.65.1, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5 (+10 more)

### Community 4 - "requireUser"
Cohesion: 0.15
Nodes (20): POST(), maxDuration, POST(), maxDuration, POST(), POST(), POST(), POST() (+12 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.07
Nodes (26): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, Flock Deep Agent (deepagents), Two-minute demo, Ducktect best option, Flock product (end-goal design) (+18 more)

### Community 6 - "ListingReel.tsx"
Cohesion: 0.07
Nodes (39): gaegu, metadata, RootLayout(), viewport, dist(), MapListingPage(), ForYouPage(), BottomNav() (+31 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.08
Nodes (20): CoStar data kit, CoStar track (Inside and Out), CoStar ingest run (ticket T3), after, args, before, communities, counts (+12 more)

### Community 8 - "matcher.ts"
Cohesion: 0.06
Nodes (47): GET(), GET(), DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt() (+39 more)

### Community 9 - "store.ts"
Cohesion: 0.12
Nodes (25): Outcome, Reason, Refresh, Rejection, stillCounts(), closestMisses(), fit(), Miss (+17 more)

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

### Community 18 - "ducktect-split.ts"
Cohesion: 0.12
Nodes (24): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+16 more)

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "ref_node_assert"
Cohesion: 0.39
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.32
Nodes (13): ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), PhotoCarousel(), likedByText(), PickCard(), RankingRow() (+5 more)

### Community 24 - "edit-demo.mjs"
Cohesion: 0.11
Nodes (22): camera(), card(), css(), DK_RESULT, dt(), ENC, fade(), files (+14 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.17
Nodes (21): addedMessage(), PickListingSheet(), ToursPage(), WEEKDAYS, WeekGrid(), AGENTS, busyMembers(), openSlots() (+13 more)

### Community 26 - "subagents.test.ts"
Cohesion: 0.18
Nodes (12): feedbackInput, cfg, FLOCK, members, P(), plan(), plans(), seed() (+4 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.14
Nodes (20): fixture(), COM(), fakeVexcel(), lat(), needs(), plan, setup(), spot() (+12 more)

### Community 28 - "smoke-agent.ts"
Cohesion: 0.14
Nodes (13): DEFAULT_MODEL, deepagents@^1.16.5, langchain@^1.6.6, deepagents, langchain, agent, contextSchema, echo (+5 more)

### Community 29 - "api.ts"
Cohesion: 0.12
Nodes (31): Chat(), send(), FlockChatSheet(), MessageSheet(), Thread(), send(), 11. Realtime, check() (+23 more)

### Community 30 - "places.ts"
Cohesion: 0.12
Nodes (23): Around, away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE (+15 more)

### Community 31 - "ducktect-agent.ts"
Cohesion: 0.28
Nodes (12): interpretation, json(), makeDucktectTools(), rationale, confirmWithSatellite(), DucktectEnv, DucktectSession, interpret() (+4 more)

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
Cohesion: 0.20
Nodes (9): 10. Auth, consent, security, 12. Testing, 13. Roadmap, 14. Two-minute demo, 15. Open questions, risks, decisions, 1. Principles, 9. API surface, Appendix: environment variables (+1 more)

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
Nodes (25): ALSO_CONSIDERED, Candidate, Constraint, explain(), explainNothing(), extraBeds(), findCandidates(), MAX_PICKS (+17 more)

### Community 40 - "group/page.tsx"
Cohesion: 0.14
Nodes (27): GroupPage(), SectionHeader(), Card(), RequestsPage(), answer(), RESULT, Avatar(), Fit() (+19 more)

### Community 41 - "SmallerFlockPrompt.tsx"
Cohesion: 0.67
Nodes (5): seen(), seenKey(), SmallerFlockPrompt(), acknowledge(), getLeftMembers()

### Community 42 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.6, eslint, eslint-config-next

### Community 43 - "2. Product scope"
Cohesion: 0.50
Nodes (4): 2.1 What a user does, 2.2 Friends flock vs Open flock, 2.3 Voting and cards, 2. Product scope

### Community 44 - "find/page.tsx"
Cohesion: 0.07
Nodes (59): SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save(), FindFlockPage() (+51 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 48 - "rerunShortlist"
Cohesion: 0.15
Nodes (9): explain(), isReason(), rerunShortlist(), ruledOut(), AgentStore, ctxOf(), fact(), json() (+1 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 50 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion@^14.14.0, @langchain/openai@^1.8.4, lucide-react@^1.72.0, next@16.4.6, react@19.3.0, react-dom@19.3.0, @supabase/ssr@^0.12.7 (+7 more)

### Community 51 - "ducktect-run.ts"
Cohesion: 0.16
Nodes (17): maxDuration, POST(), createDucktectAgent(), ducktectModel(), newSession(), conciseSummary(), AERIAL_CALLS, AGENT_DEADLINE_MS (+9 more)

### Community 52 - "test-pins.mjs"
Cohesion: 0.20
Nodes (7): admin, flocks, opts, people, pinA, st, tag

### Community 53 - "account/page.tsx"
Cohesion: 0.10
Nodes (23): AccountPage(), Section(), Stats, findAddress(), LA, PanTo(), PinSheet(), save() (+15 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "next"
Cohesion: 0.15
Nodes (16): ComparePickPage(), Source, SOURCES, InvitePage(), MembersPage(), StashPage(), NavBar(), FLOCK_NAME (+8 more)

### Community 57 - "map/page.tsx"
Cohesion: 0.05
Nodes (58): CENTER, CHIPS, ClusterMarker(), DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect() (+50 more)

### Community 58 - "demo-agent.mjs"
Cohesion: 0.20
Nodes (9): readEvents(), admin, flock, opts, people, post(), st, tag (+1 more)

### Community 59 - "listing/[id]/page.tsx"
Cohesion: 0.28
Nodes (15): ListingDetailPage(), toggleLike(), badge(), FlockPicksPage(), toggleLike(), Pick, Sort, toPicks() (+7 more)

### Community 60 - "test-places.mjs"
Cohesion: 0.22
Nodes (10): @supabase/supabase-js, anon, at(), check(), dead, LA, opts, st (+2 more)

### Community 61 - "seed-demo.mjs"
Cohesion: 0.50
Nodes (3): files, r, SCENARIOS

### Community 62 - "subagents.test.ts"
Cohesion: 0.10
Nodes (21): cfg(), collect(), FLOCK, P(), plan(), seed(), U(), DUCKTECT_TOOL_NAMES (+13 more)

### Community 63 - "tours/[id]/page.tsx"
Cohesion: 0.50
Nodes (7): TourDetailPage(), rsvp(), cancelTour(), changed(), getTour(), joinTour(), leaveTour()

### Community 64 - "vexcel.test.ts"
Cohesion: 0.29
Nodes (4): canonicalPhrase(), normalizePhrase(), squareWkt(), checkable

### Community 65 - "vexcel.ts"
Cohesion: 0.13
Nodes (19): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+11 more)

### Community 68 - "8. The agent (LangChain Deep Agents)"
Cohesion: 0.18
Nodes (11): 8.10 LangChain track checklist, 8.1 How we use each Deep Agents capability, 8.2 Topology, 8.3 Tools (LangChain `tool()` + zod), 8.4 Safety rules, 8.5 Runtime sketch, 8.6 Runtime notes and risks **[verify]**, 8.7 Memory (+3 more)

### Community 69 - "prompts.ts"
Cohesion: 0.21
Nodes (13): checkpointer, FLOCK_PROMPT, AgentContext, contextSchema, findOpenFlocksInput, lat, lng, processFeedbackInput (+5 more)

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

### Community 77 - "record-demo.mjs"
Cohesion: 0.24
Nodes (12): drag(), frames, marks, nav(), scrollTo(), signIn(), smoothScroll(), takes (+4 more)

### Community 79 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:seed, dev, dev:local, lint, start

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 486 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-places.mjs` to `ingest-places.ts`, `package.json`, `requireUser`, `CoStar Data Ingest`, `matcher.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `ducktect-testkit.ts`, `places.ts`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `dependencies`, `ducktect-run.ts`, `test-pins.mjs`, `test-ducktect-api.mjs`, `demo-agent.mjs`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compare/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0975609756097561 - nodes in this community are weakly interconnected._
- **Why does `react` connect `account/page.tsx` to `compare/page.tsx`, `react`, `package.json`, `ListingReel.tsx`, `group/page.tsx`, `SmallerFlockPrompt.tsx`, `find/page.tsx`, `dependencies`, `format.ts`, `next`, `map/page.tsx`, `listing/[id]/page.tsx`, `api.ts`, `BookTourSheet.tsx`, `tours/[id]/page.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `compare/page.tsx`, `react`, `package.json`, `ListingReel.tsx`, `group/page.tsx`, `SmallerFlockPrompt.tsx`, `proxy.ts`, `find/page.tsx`, `dependencies`, `account/page.tsx`, `format.ts`, `BookTourSheet.tsx`, `listing/[id]/page.tsx`, `map/page.tsx`, `tours/[id]/page.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._