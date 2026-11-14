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
supabase db push                                   # applies 0001, 0002, 0003 in order
psql "$DATABASE_URL" -f supabase/dev-open-access.sql   # or paste it into the SQL editor; see below
```

Then copy the project URL and anon key into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Locally: `supabase start` and `supabase db reset` rebuild everything from these files.

**Until sign-in exists** the app acts as whichever person the switcher picks, using only the anon key, so with
strict RLS it would see nothing. For demos, apply `supabase/dev-open-access.sql` after the migrations. It
reproduces today's behavior, where the anon key can read and write every row, so never apply it to a project with
real users. Drop it when auth lands (ticket T9); the policies in `0003_rls.sql` are already written for signed-in users.

**Check security:** `node scripts/check-rls.mjs`. On a project with only the three migrations it passes. With the open-access file applied it fails on purpose.

The schema file was reconstructed from `lib/api.ts` and the live data, not dumped from the database. Compare it with
`supabase db dump --schema public` before relying on it.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
