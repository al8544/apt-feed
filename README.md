# Flock

Collaborative apartment hunting: you and your flock swipe, shortlist, compare and tour places together. Design and roadmap: `docs/DESIGN.md`.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Quick start (run it on your own computer)

You need **Docker Desktop** (open and running), **Node 22+**, and `unzip`. Everything runs locally; nothing touches our real database.

**0. Install the tools** (skip if you already have Docker Desktop, Node 22+ and `unzip`):

- **macOS / Linux:** `./bootstrap.sh` installs whatever is missing (macOS needs [Homebrew](https://brew.sh) first). If it installed Docker Desktop, open it, accept the terms, and wait until it says it is running.
- **Windows:** in PowerShell run `winget install OpenJS.NodeJS.LTS` and `winget install Docker.DockerDesktop`, reboot if asked, open Docker Desktop and wait until it is running. Then use **Git Bash** (installed with [Git for Windows](https://git-scm.com), it includes `unzip`) for every command below.

**1. Install and create the local database** (the first run downloads a few GB of Docker images, so allow a few minutes):

```bash
npm install
npm run setup
```

**2. Add the listings.** The apartment data is the hackathon's CoStar kit, which we can't redistribute. Download the zip from the link in the hackathon packet (`F26 Onsite Hacker Packet.pdf`) and load it, using the zip's password from the same packet:

```bash
npm run db:ingest -- ~/Downloads/<kit-file>.zip <zip-password>
```

You should see a report ending in the number of communities and listings written.

**3. Add your API keys.** Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` and `OPENAI_API_KEY` (the map and the Ducktect AI agent need them; the rest of the app works without). Leave the Supabase variables empty, because the next command points the app at the local database for you.

**4. Run the app:**

```bash
npm run dev:local
```

Your browser opens http://localhost:3000. Sign in as **`vinnie@flock.test`** / **`flock1234`** (already in a flock with 4 friends), or press Sign up and make a new account. Each run resets the demo accounts and flocks (listings stay).

To start as a brand-new user instead (no accounts, sign up and join one of 3 seeded flocks): `npm run dev:new-user`.

Stop the database when you're done: `npx supabase stop`.

## More commands

| Command | What you get |
|---|---|
| `npm run dev:local` | Local database reset to **in-flock**: sign in as `vinnie@flock.test` / `flock1234`, already in a flock with 4 friends (`maya@`, `jordan@`, `sam@`, `priya@flock.test` work too). Vinnie is admin of the open flock and `alex@flock.test` has a pending request to join. |
| `npm run dev:new-user` | Local database reset to **new-user**: no accounts. Sign up, then make a friends flock or join one of 3 seeded open flocks. |
| `npm run db:seed` / `npm run db:seed -- new-user` | Same reset, without starting the app. |
| `npm run dev` | The app against the **real** project (`.env.local`). No reset. |

Both `dev:local` commands first wipe all accounts, flocks, swipes, stash and tours in the local database and keep the listings. Details in `docs/LOCAL_DATABASE.md`.

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
supabase db push                                   # applies every file in supabase/migrations in order (0001 to 0019)
psql "$DATABASE_URL" -f supabase/dev-open-access.sql   # or paste it into the SQL editor; see below
```

Then copy the project URL and anon key into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Locally: `supabase start` and `supabase db reset` rebuild everything from these files.

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

## Thumbs-down reasons, Pass and Like (ticket T13)

After a thumbs-down on the reels, a "Why the nope?" sheet offers reason chips (too far, too expensive, no pets, too small, bad photos, not my area, other).
`POST /api/agent/feedback` records them and `rerunShortlist` (`lib/agent/feedback.ts`, plain code, no model call) searches again without what the
reasons rule out and saves the top 5. The same refresh runs when someone joins the flock (not yet when someone leaves). The person is told what happened: picks updated, nothing
changed, nothing else fits (the old shortlist is kept), or no budget set. A "too expensive" expires when a newer member joins, and feedback from people
who left is ignored. `lib/agent/subagents.ts` holds the `apartment-searcher` and a read-only `roommate-matcher`. Design: `docs/DESIGN.md` §8.3a.

On the UI side the Stash button is gone. The reels have **Pass** (skip with no vote; the place can come back next visit), Flock picks and the listing
detail have **Like** (your thumbs-up vote), and sheets can be dragged down to close.

```bash
node --test lib/agent/subagents.test.ts   # three profiles, ten floor plans, every reason, outcomes, expiry; no database, no key
```

## Commute pins

Set a pin for where you travel to most from **Account → Commute pin** or **Flock → Flock preferences → Commute pin**: search an address (OpenStreetMap's
free search, no key; the address is not stored, only the point) or tap the map. **Your flockmates can see your pin**, in friends and open flocks alike;
strangers cannot. The listing page shows how far the place is from your pin, and "too far" feedback uses the distance to the flock's pins
(`flock_pin_distances`; with no pins it falls back to the same community). The distance is straight-line, not a route.

Needs migrations `0018_member_pins.sql` and `0019_share_pins.sql`. Without them everything else still works; the pin sheet just cannot save.

```bash
node scripts/test-pins.mjs    # local database: flockmates see pins and distances, strangers do not, nobody edits another's pin
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
