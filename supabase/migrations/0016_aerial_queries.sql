-- Cache of Vexcel aerial checks (docs/DESIGN.md §5.2, §6.3, ticket T14). One row per community + normalized phrase + search size.
-- Additive. The property attributes (pool, tree cover, ...) go in listing_enrichment.vexcel_attributes, which 0006 already created.
create table public.aerial_queries (
  community_id uuid not null references public.communities on delete cascade,
  phrase       text not null,            -- canonical visual phrase, e.g. 'swimming pool' (lib/enrich/vexcel.ts canonicalPhrase)
  buffer_m     int  not null,            -- half the side of the square searched around the community, in metres
  result       jsonb not null,           -- { method: 'detect', found, count, maxConfidence, threshold, imagery: { collection, capturedAt } }
  score        real,                     -- highest detection confidence, 0 to 1 (0 = looked and saw none). Vexcel's own number, not ours
  fetched_at   timestamptz not null default now(),
  primary key (community_id, phrase, buffer_m)
);
create index aerial_queries_community_idx on public.aerial_queries (community_id);

alter table public.aerial_queries enable row level security;
create policy "anyone reads aerial queries" on public.aerial_queries for select using (true);
-- No write policies: only the service role (scripts/enrich-vexcel.ts and server code) writes. Failed calls are never cached,
-- only a real answer is, including "looked and saw none".
