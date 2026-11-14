# Local test database

A Supabase that runs on your laptop in Docker. Use it to try migrations, the CoStar load and the LA cutover
without touching the real project. All commands run from the `apt-feed` folder.

## Start

```bash
open -a Docker        # if Docker Desktop is not running; wait until it is up
supabase start
```

| | |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio (browse tables, run SQL) | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

`supabase status` prints the URLs and keys again (`supabase status -o json` for scripts).
The first start downloads several GB of images. It applies every file in `supabase/migrations/` on a fresh database.

## Stop

```bash
supabase stop                  # keeps the data: the next `supabase start` picks up where you left off
supabase stop --no-backup      # also deletes the data: the next start is empty
```

To free the disk space, stop it, quit Docker Desktop, and optionally run `docker system prune -a` to remove the images.

## Rebuild from scratch

```bash
supabase db reset
```

This drops everything and reapplies migrations `0001` to `0005`. The LA data and the cutover are gone afterwards, and
the Brooklyn seed is back. Redo the load below.

## Load the LA data (from an empty or freshly reset database)

1. Put the CoStar zip somewhere and set `COSTAR_KIT_ZIP` and `COSTAR_ZIP_PASSWORD` in `.env.local`
   (or extract it into `data/costar-kit/`). Both are gitignored.
2. Point the ingest script at the local database in `.env.ingest` (gitignored):
   ```bash
   cat > .env.ingest <<EOF
   INGEST_SUPABASE_URL=http://127.0.0.1:54321
   INGEST_SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | python3 -c 'import sys,json;print(json.load(sys.stdin)["SERVICE_ROLE_KEY"])')
   EOF
   ```
3. Load it. Run it twice: the second run must change nothing.
   ```bash
   node --env-file=.env.ingest scripts/ingest-costar.ts --write --confirm 127.0.0.1:54321
   ```
3b. Galleries (from the kit, 8,957 photos):
   ```bash
   node --env-file=.env.ingest scripts/ingest-costar-media.ts --write --confirm 127.0.0.1:54321
   ```
4. Demo access: the app has no sign-in yet, so strict row-level security would hide everything from it.
   ```bash
   docker exec -i supabase_db_flock psql -U postgres -q < supabase/dev-open-access.sql
   ```
5. Cutover from Brooklyn to LA. **Destructive**: deletes all swipes, stash, tours, attendees and messages and the
   Brooklyn listings. Fine on the local database.
   ```bash
   docker exec -i supabase_db_flock psql -U postgres -q < supabase/cutover-brooklyn-to-la.sql
   ```

Check the result in Studio, or with `docker exec -i supabase_db_flock psql -U postgres -c "select source, count(*) from listings group by 1"`
(expect `costar | 6543`).

## Run the app against it

```bash
npm run dev:local
```

It reads the local database's URL and key from `supabase status` and starts the app on port 3000, with nothing
changed in `.env.local`. It stops with an error if the local database is not running. Stop the app with Ctrl+C.

A plain `npm run dev` still talks to the **real** project. Keep the app on port 3000: the Google Maps key only works there.

## Test the flock functions

```bash
node scripts/test-flocks.mjs
```

Creates throwaway users and flocks in the local database, races two joins for the last seat 25 times, checks that non-members
read nothing, then deletes everything. It refuses to run against anything but 127.0.0.1.

## Check row-level security

```bash
RLS_CHECK_URL=http://127.0.0.1:54321 \
RLS_CHECK_KEY=$(supabase status -o json | python3 -c 'import sys,json;print(json.load(sys.stdin)["ANON_KEY"])') \
node scripts/check-rls.mjs
```

It passes on a database with only the migrations. It fails on purpose once `dev-open-access.sql` is applied.

## Troubleshooting

- **`Cannot connect to the Docker daemon`**: Docker Desktop is not running. `open -a Docker`, wait, retry.
- **Port already in use** (54321 to 54324): another Supabase stack is running. `supabase stop`, or find it with `docker ps`.
- **Map shows "Oops! Something went wrong"**: the Maps key is restricted to `localhost:3000`. Use that port.
- **The app shows nothing**: row-level security is hiding the rows from the anon key. Apply `supabase/dev-open-access.sql`.
