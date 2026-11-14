# Flock

Collaborative apartment hunting: you and your flock swipe, shortlist, compare and tour places together. Design and roadmap: `docs/DESIGN.md`.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database

The schema, demo data and row-level security live in `supabase/` so anyone can rebuild the database.

| File | What it does |
|---|---|
| `supabase/migrations/0001_schema.sql` | Tables, indexes, the `group_likes` view, realtime on `swipes` and `messages` |
| `supabase/migrations/0002_seed.sql` | The fictional Brooklyn Crew, 45 listings, their tours and swipes |
| `supabase/migrations/0003_rls.sql` | Row-level security on every table: group members see their group, private rows stay private, anon gets listings only |
| `supabase/dev-open-access.sql` | Demo only: opens every table to the anon key so the app works before sign-in exists |
| `scripts/check-rls.mjs` | Tries to read and write private rows with the anon key from `.env.local`; exits 1 if it can |

**Set up a new Supabase project** (Dashboard SQL editor, or the CLI):

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                                   # applies every file in supabase/migrations in order (0001 to 0013)
psql "$DATABASE_URL" -f supabase/dev-open-access.sql   # or paste it into the SQL editor; see below
```

Then copy the project URL and anon key into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Locally: `supabase start` and `supabase db reset` rebuild everything from these files.

**Demo starts (local):** `npm run dev:local` first resets the local database's user data to a known scenario, so every run starts the same. It keeps the listings and deletes all accounts, flocks, swipes and tours.
`npm run dev:local` starts **in-flock** (Vinnie is already in a flock, demo switcher). `npm run dev:local -- new-user` starts with no accounts: sign up, then start a friends flock or join one of 3 seeded open flocks. `npm run db:seed [-- new-user]` resets without starting the app. Details in `docs/LOCAL_DATABASE.md`.

**Google Maps (local):** put `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAP_ID` in `.env.local` (git-ignored). `npm run dev:local` reads them. Keep the app on port 3000, where the key is allowed.

**Until sign-in exists** the app acts as whichever person the switcher picks, using only the anon key, so with
strict RLS it would see nothing. For demos, apply `supabase/dev-open-access.sql` after the migrations. It
reproduces today's behavior, where the anon key can read and write every row, so never apply it to a project with
real users. Drop it when auth lands (ticket T9); the policies in `0003_rls.sql` are already written for signed-in users.

**Check security:** `node scripts/check-rls.mjs`. On a project with only the three migrations it passes. With the open-access file applied it fails on purpose.

The schema file was reconstructed from `lib/api.ts` and the live data, not dumped from the database. Compare it with
`supabase db dump --schema public` before relying on it.

## Flocks (ticket T6)

Migration `0008_flocks.sql` turns the single hard-coded group into flocks: `flocks` (friends or open, any size from 2 up via
`max_size`), `flock_members` with a status (invited, requested, active, declined, left), votes scoped to a flock
(`swipes.flock_id`), the `flock_votes` view, `public_profiles` (discoverable people, no budget or habits), and tables for
`proposals`, `flock_feedback` and `agent_runs`. `create_flock()`, `join_flock()`, `set_flock_open()` and `answer_join_request()` are database functions. An open flock is listed in
Find a flock; people send a request (`join_flock`) and an admin approves it (no screen for that yet). Approval takes a row
lock, so two people can never take the last seat. The API routes `POST /api/flocks` and `POST /api/flocks/[id]/join` call them
with the caller's access token (`Authorization: Bearer ...`).

```bash
node scripts/test-flocks.mjs            # integration test against the LOCAL database: races, privacy, rules (needs supabase start)
node --test lib/flocks.test.ts          # request validation
```

The app itself still acts as one flock (`GROUP_ID` in `lib/api.ts`, now sent as `flock_id`) and has no sign-in, so nothing in the UI
calls the new routes yet (ticket T9). The old `groups`, `group_members` and `group_likes` names are gone.

## The Flock agent (ticket T12)

A LangChain Deep Agent (`lib/agent/`): an orchestrator that owns the writes (`update_shortlist`, `send_invites`, `process_feedback`) and an
`apartment-searcher` subagent (`search_apartments`, `rank_apartments`, built on `lib/match`). `POST /api/agent` streams NDJSON events (plan,
steps, tokens, tool results, approval requests); `POST /api/agent/resume` approves or rejects a paused action. The tools run as the signed-in
caller on a user-scoped Supabase client (never the service-role key), the flock and user come from the request, the thread id is derived on the
server, each caller gets a daily call budget (`AGENT_DAILY_LIMIT`, default 60), and every run is logged to `agent_runs`. A saved pick's
explanation is built in code from the checks, so it cannot contain a number the tools did not return.

```bash
node --test lib/agent/agent.test.ts            # real agent graph, scripted fake model: no key, no network, no database
node scripts/smoke-agent.ts --fake             # smoke test with the scripted model
node --env-file=.env.local scripts/smoke-agent.ts   # smoke test on the real model, gpt-5-mini (a few cents)
node scripts/test-agent-db.mjs                 # database side under RLS (local, migrations only: supabase db reset first)
node scripts/test-agent-api.mjs                # HTTP gates; start `OPENAI_API_KEY=dummy AGENT_DAILY_LIMIT=3 npm run dev:local` first
```

Needs migration `0009` and `OPENAI_API_KEY` on the server; the model is `openai:gpt-5-mini`. Without the key the routes answer 503.
`node scripts/demo-agent.mjs` runs the ticket's acceptance flow against the real model through the real routes (start `npm run dev:local` first; a few cents): the demo wish saves a shortlist, rejecting an invite pauses and resumes, no invented numbers.
The agent keeps its threads and pauses in memory, so run it on a long-lived Node host, not serverless. There is no UI for it: the Ask Flock sheet was
removed. The routes need a signed-in account, which arrives with T9.

## Voting and the flock score (ticket T8)

Votes are thumbs up (`direction = 'right'`) or thumbs down (`'left'`), one row per person, place and flock; changing a vote
updates the row. `flockScore` in `lib/compare.ts` is `round(70 x up / members + 0.3 x fit)`, computed on every read, never stored.
When thumbs-down reaches half the active members, rounded up (1 of 2, 2 of 3, 2 of 4, 3 of 5), a place leaves the flock's rankings
and Flock picks and is not suggested again in the deck; any thumbs-down short of that shows a "N down" chip on its card. The group
and picks screens subscribe to the flock's votes, so another member's vote shows up without a reload.

```bash
node --test lib/compare.test.ts      # score and removal-rule unit tests
node scripts/test-votes.mjs          # live-vote integration test (local database, migrations only: supabase db reset first)
```

## CoStar listings (ticket T3)

Real Los Angeles floor plans come from the CoStar kit. Put the zip anywhere and set `COSTAR_KIT_ZIP` and
`COSTAR_ZIP_PASSWORD` in `.env.local` (never commit them; `data/` is gitignored), or extract it into `data/costar-kit/`.

```bash
node scripts/ingest-costar.ts            # dry run: reads the kit, prints the report, touches no database
node --test lib/costar/map.test.ts       # unit tests for the mapping
```

To load a database, use a **test** database first (local `supabase start` + `supabase db reset`, or a second
project), put its URL and service-role key in `.env.ingest` as `INGEST_SUPABASE_URL` and
`INGEST_SUPABASE_SERVICE_ROLE_KEY`, apply `0004_costar.sql`, then:

```bash
node --env-file=.env.ingest scripts/ingest-costar.ts --write --confirm <that-database-host>
```

Safe to re-run: it upserts on the CoStar ids and never deletes (plans missing from a later kit get `active = false`).
It refuses to write unless `--confirm` repeats the host, and refuses the project in `.env.local` unless `--allow-live`.
The map and swipe deck read the view `listing_cards` (migration `0005`): one card per community, its cheapest active
floor plan, so 739 LA cards instead of 6,543 plans. Votes stay on the floor plan.

**Cutover from the Brooklyn seed (ticket T4)** is deliberately not a migration. `supabase/cutover-brooklyn-to-la.sql`
deletes all swipes, stash, tours, attendees and messages and the Brooklyn listings, and rewrites the demo people for
LA. Do it in this order, on a test database first and a backed-up real one after: `0004`, ingest, `0005`, the cutover
file, then deploy the app. To run the app against a local database, start it with
`NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run dev` (shell variables beat `.env.local`).
The Maps key only works on port 3000.

## Galleries (ticket T5)

**From the kit (no scraping).** The kit's property records hold real galleries: building, interior, lobby and aerial photos
for every LA community (every one of them, median 33 per community). After `scripts/ingest-costar.ts`:

```bash
node scripts/ingest-costar-media.ts                       # dry run: counts only
node --env-file=.env.ingest scripts/ingest-costar-media.ts --write --confirm <db-host>
node --test lib/costar/media.test.ts
```

Needs migrations `0006` and `0007`. The swipe deck then flips through the gallery (tap the photo's left or right edge).

**Not used: Apartments.com.** The team shipped the kit's galleries instead. `scripts/enrich-apartments-com.ts` stays in the repo, off unless `APARTMENTS_COM_ENRICH=on`, and must not be run before `docs/permissions/apartments-com.md` is filled in. It can add photos and a few details for the
communities you list in `data/apartments-com-overrides.json` (`{"<costar_property_id>": "https://www.apartments.com/..."}`,
matched by hand). Read `docs/permissions/apartments-com.md` first and fill in the approval record.

```bash
node scripts/enrich-apartments-com.ts           # reads pages already cached in .cache/apartments-com/, prints what they hold
ENRICH_CONTACT=you@example.com node scripts/enrich-apartments-com.ts --fetch     # also downloads missing pages, politely
node --env-file=.env.ingest scripts/enrich-apartments-com.ts --write --confirm <db-host>   # save (test database first)
node --test lib/enrich/apartments-com.test.ts
```

Polite by design: one request at a time with a 4 to 8 second pause, honest User-Agent, robots.txt respected, pages cached on
disk, and it **stops** if a page shows a CAPTCHA or blocks it. `APARTMENTS_COM_ENRICH=off` is the kill switch. Needs migration
`0006`. The swipe deck flips through the gallery (tap the photo's left or right edge) with a "Photo: Apartments.com" credit,
and a photo that fails to load falls back to the gradient.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
