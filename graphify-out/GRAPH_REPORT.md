# Graph Report - apt-feed  (2026-11-15)

## Corpus Check
- 196 files · ~130,618 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .ico 1)

## Summary
- 1407 nodes · 3447 edges · 61 communities (56 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f69bdf9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compare/page.tsx
- places.ts
- ingest-places.ts
- package.json
- requireUser
- Product Concept & Agents
- ListingReel.tsx
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
- listing-fit.ts
- api.ts
- ducktect-split.ts
- ducktect.ts
- @supabase/supabase-js
- test-flocks.mjs
- test-proposals.mjs
- Flock — End-Goal Design & Implementation Guide
- test-agent-api.mjs
- test-agent-db.mjs
- apartments-com.ts
- ducktect-run.ts
- group/page.tsx
- Flock demo video: script
- store.ts
- vexcel.test.ts
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
- test-places.mjs
- seed-demo.mjs
- subagents.test.ts
- vexcel.ts
- prompts.ts

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
- `Voting and the flock score (ticket T8)` --references--> `flockScore()`  [INFERRED]
  README.md → lib/compare.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ducktect best option pipeline** — docs_design_ducktect, docs_design_apartment_searcher, docs_design_aerial_evidence, docs_design_listing_fit, docs_design_costar_kit [INFERRED 0.85]
- **Flock agent team** — docs_design_deep_agent, docs_design_orchestrator, docs_design_roommate_matcher, docs_design_apartment_searcher, docs_design_aerial_evidence [INFERRED 0.85]
- **Listing data sources** — docs_design_costar_kit, docs_design_apartments_com, docs_design_vexcel, scripts_ingest_costar [INFERRED 0.85]

## Communities (61 total, 5 thin omitted)

### Community 0 - "compare/page.tsx"
Cohesion: 0.07
Nodes (49): ALL_KEYS, Cell(), ComparePage(), DEFAULT_PREFS, loadPrefs(), MetricsSheet(), Prefs, prefsKey() (+41 more)

### Community 1 - "places.ts"
Cohesion: 0.12
Nodes (23): Around, away(), Bounds, distanceTo(), inside(), label(), MIN_PER_KM, NOT_A_PLACE (+15 more)

### Community 2 - "ingest-places.ts"
Cohesion: 0.09
Nodes (30): areaM2(), areaRows(), args, assemble(), BBOX, bboxOf(), describe(), El (+22 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (46): eslintConfig, dependencies, framer-motion@^14.14.0, @langchain/core@^1.4.1, @langchain/langgraph@^1.7.4, @langchain/openai@^1.8.4, lucide-react@^1.72.0, next@16.4.6 (+38 more)

### Community 4 - "requireUser"
Cohesion: 0.10
Nodes (33): POST(), maxDuration, POST(), maxDuration, POST(), maxDuration, POST(), POST() (+25 more)

### Community 5 - "Product Concept & Agents"
Cohesion: 0.07
Nodes (26): aerial-evidence subagent, apartment-searcher subagent, Apartments.com image enrichment, compat() roommate compatibility, Flock Deep Agent (deepagents), Two-minute demo, Ducktect best option, Flock product (end-goal design) (+18 more)

### Community 6 - "ListingReel.tsx"
Cohesion: 0.08
Nodes (41): gaegu, metadata, RootLayout(), viewport, toggleLike(), dist(), MapListingPage(), toggleLike() (+33 more)

### Community 7 - "CoStar Data Ingest"
Cohesion: 0.08
Nodes (20): CoStar data kit, CoStar track (Inside and Out), CoStar ingest run (ticket T3), after, args, before, communities, counts (+12 more)

### Community 8 - "matcher.ts"
Cohesion: 0.07
Nodes (37): GET(), GET(), DAILY_LIMIT, maxDuration, POST(), Analyze, analyzeFlocks(), buildPrompt() (+29 more)

### Community 9 - "index.ts"
Cohesion: 0.13
Nodes (18): explain(), isReason(), Outcome, Reason, Refresh, Rejection, rerunShortlist(), ruledOut() (+10 more)

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
Cohesion: 0.13
Nodes (4): Option, framer-motion, react, @vis.gl/react-google-maps

### Community 19 - "Local test database"
Cohesion: 0.15
Nodes (12): Check row-level security, Keep your local database in step with the migrations, Load the LA data (from an empty or freshly reset database), Local test database, Rebuild from scratch, Run the app against it, Start, Stop (+4 more)

### Community 20 - "ref_node_assert"
Cohesion: 0.29
Nodes (5): photoUrl(), KitAttachment, pickGallery(), PRIORITY, sameImage()

### Community 21 - "Apartments.com enrichment: permission record"
Cohesion: 0.40
Nodes (4): Apartments.com enrichment: permission record, Evidence (fill in; the approval was verbal, so write down where it is), Limits we keep regardless, What was approved

### Community 23 - "format.ts"
Cohesion: 0.18
Nodes (22): ListingDetailPage(), StashPage(), ListingCard(), gradientFor(), GRADIENTS, ListingPhoto(), SwipeCard(), fling() (+14 more)

### Community 24 - "edit-demo.mjs"
Cohesion: 0.06
Nodes (46): OUTRO, SCENES, TITLE, camera(), cameraPath(), card(), css(), data (+38 more)

### Community 25 - "BookTourSheet.tsx"
Cohesion: 0.13
Nodes (30): badge(), FlockPicksPage(), Pick, Sort, toPicks(), addedMessage(), PickListingSheet(), ToursPage() (+22 more)

### Community 26 - "FlockChatSheet.tsx"
Cohesion: 0.19
Nodes (16): Chat(), send(), FlockChatSheet(), Sheet(), seen(), seenKey(), SmallerFlockPrompt(), acknowledge() (+8 more)

### Community 27 - "ducktect-testkit.ts"
Cohesion: 0.11
Nodes (23): DUCKTECT_TOOL_NAMES, cfg, fixture(), INTERPRETED, MAX_PLACES, newSession(), SHORTLIST, RawInterpretation (+15 more)

### Community 28 - "listing-fit.ts"
Cohesion: 0.14
Nodes (17): stillCounts(), Miss, same(), activeMembers(), apportion(), bedroomsNeeded(), Feasibility, feasibility() (+9 more)

### Community 29 - "api.ts"
Cohesion: 0.14
Nodes (27): ComparePickPage(), Source, SOURCES, MessageSheet(), Thread(), send(), check(), decorate() (+19 more)

### Community 30 - "ducktect-split.ts"
Cohesion: 0.11
Nodes (25): AREA_CENTERS, areaByName(), areaLabel(), areaViewport(), bedsOf(), Check, clip(), dedupe() (+17 more)

### Community 31 - "ducktect.ts"
Cohesion: 0.13
Nodes (19): ALSO_CONSIDERED, Candidate, Constraint, explain(), explainNothing(), extraBeds(), findCandidates(), MAX_PICKS (+11 more)

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
Cohesion: 0.35
Nodes (9): asArray(), httpsUrl(), imageUrls(), isBlocked(), isObj(), Json, jsonLdNodes(), MediaItem (+1 more)

### Community 39 - "ducktect-run.ts"
Cohesion: 0.18
Nodes (24): createDucktectAgent(), ducktectModel(), interpretation, json(), makeDucktectTools(), rationale, confirmWithSatellite(), DucktectEnv (+16 more)

### Community 40 - "group/page.tsx"
Cohesion: 0.14
Nodes (26): GroupPage(), SectionHeader(), Card(), RequestsPage(), answer(), RESULT, Avatar(), AvatarUser (+18 more)

### Community 41 - "Flock demo video: script"
Cohesion: 0.17
Nodes (11): 1. The problem · 0:00 to 0:16 (16s), 2. The idea · 0:16 to 0:24 (8s), 3. Home: your group's ranked list · 0:24 to 0:38 (14s), 4. Scroll to find new places · 0:38 to 0:50 (12s), 5. Or use the map · 0:50 to 0:59 (9s), 6. Ducktective · 0:59 to 1:15 (16s), 7. Tours on a shared calendar · 1:15 to 1:27 (12s), 8. Compare, like PC specs · 1:27 to 1:42 (15s) (+3 more)

### Community 42 - "store.ts"
Cohesion: 0.22
Nodes (7): CandidateQuery, Needs, Row, SavedPick, ShortlistRow, UserContext, Viewport

### Community 43 - "vexcel.test.ts"
Cohesion: 0.22
Nodes (5): canonicalPhrase(), createVexcel(), normalizePhrase(), squareWkt(), checkable

### Community 44 - "find/page.tsx"
Cohesion: 0.05
Nodes (75): POST(), SignInPage(), submit(), SignUpPage(), submit(), WelcomePage(), Basics(), save() (+67 more)

### Community 46 - "enrich-vexcel.ts"
Cohesion: 0.12
Nodes (17): args, budget, buffer, C, db, fetchLive, flag(), maxCalls (+9 more)

### Community 47 - "aerial.ts"
Cohesion: 0.15
Nodes (17): aerialEvidence(), Community, DEFAULT_BUFFER_M, Evidence, evidenceFromAttributes(), evidenceFromQuery(), EvidenceOptions, notCheckable() (+9 more)

### Community 49 - "test-aerial.mjs"
Cohesion: 0.17
Nodes (10): admin, anon, C, community, imagery, must(), opts, rows() (+2 more)

### Community 52 - "test-pins.mjs"
Cohesion: 0.20
Nodes (7): admin, flocks, opts, people, pinA, st, tag

### Community 53 - "account/page.tsx"
Cohesion: 0.15
Nodes (21): AccountPage(), Section(), Stats, findAddress(), LA, PanTo(), PinSheet(), save() (+13 more)

### Community 55 - "test-ducktect-api.mjs"
Cohesion: 0.16
Nodes (10): admin, ask(), flock, LIMIT, opts, people, post(), st (+2 more)

### Community 56 - "next"
Cohesion: 0.19
Nodes (16): InvitePage(), MembersPage(), TourDetailPage(), rsvp(), NavBar(), cancelTour(), changed(), CURRENT_USER_ID (+8 more)

### Community 57 - "map/page.tsx"
Cohesion: 0.05
Nodes (51): CENTER, CHIPS, ClusterMarker(), DucktectMapEffects(), LatLng, LocateButton(), MapPage(), startDucktect() (+43 more)

### Community 58 - "demo-agent.mjs"
Cohesion: 0.20
Nodes (8): admin, flock, opts, people, post(), st, tag, turn()

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
Cohesion: 0.14
Nodes (18): C, fakeVexcel(), ALIASES, ATTRIBUTE_PHRASES, FEELINGS, INDOOR, isObj(), Json (+10 more)

### Community 69 - "prompts.ts"
Cohesion: 0.09
Nodes (27): checkpointer, DEFAULT_MODEL, DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT, DUCKTECT_SCOUT_PROMPT, FLOCK_PROMPT, MATCHER_PROMPT, MATCHER_SUBAGENT_PROMPT (+19 more)

## Knowledge Gaps
- **12 isolated node(s):** `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block`, `Next.js feedback reporting block`, `flock_votes view` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 496 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `test-places.mjs` to `places.ts`, `ingest-places.ts`, `package.json`, `requireUser`, `CoStar Data Ingest`, `matcher.ts`, `ingest-costar-media.ts`, `enrich-apartments-com.ts`, `@supabase/supabase-js`, `test-flocks.mjs`, `test-proposals.mjs`, `test-agent-api.mjs`, `test-agent-db.mjs`, `ducktect-run.ts`, `store.ts`, `enrich-vexcel.ts`, `aerial.ts`, `test-aerial.mjs`, `test-pins.mjs`, `test-ducktect-api.mjs`, `demo-agent.mjs`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **What connects `communities table`, `Brooklyn-to-LA cutover (ticket T4)`, `Next.js agent rules block` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compare/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06708595387840671 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `compare/page.tsx`, `package.json`, `ListingReel.tsx`, `group/page.tsx`, `find/page.tsx`, `account/page.tsx`, `format.ts`, `next`, `map/page.tsx`, `FlockChatSheet.tsx`, `api.ts`, `BookTourSheet.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Why does `flockScore()` connect `compare/page.tsx` to `group/page.tsx`, `api.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `ingest-places.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907258064516129 - nodes in this community are weakly interconnected._