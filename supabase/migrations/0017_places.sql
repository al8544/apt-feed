-- Named places around LA from OpenStreetMap (© OpenStreetMap contributors, ODbL), for Ducktect's "look around" (docs/DESIGN.md §8.9).
-- A person can ask for anything ("a climbing gym I can walk to", "vegan food", "easy to get to the hospital"), so this is not a list of categories:
-- every named shop, amenity, leisure, tourism, craft and healthcare place is kept with a searchable text of its name and tags, and the model's own words
-- are searched against it. Imagery cannot answer these (Vexcel's embedding scores overlap between parks and dense blocks and its detector never
-- finds a "park", probed Nov 2026). Loaded once by scripts/ingest-places.ts; nothing is fetched at request time.
-- Additive. Public data, so anyone may read; only the service role (the ingest script) writes.
create table public.places (
  id          text primary key,            -- the OpenStreetMap element, e.g. 'way/161705352' or 'node/123'
  name        text,
  kind        text not null,               -- a short label built from its tags, e.g. 'climbing gym', 'supermarket', 'park'
  search_text text not null,               -- lowercase words from its name and tags (sport, cuisine, diet, brand ...) that a search matches
  search_tsv  tsvector generated always as (to_tsvector('simple', search_text)) stored,
  area_m2     real,                        -- for areas such as parks; null for points
  lat         double precision not null,   -- centre, for display
  lng         double precision not null,
  south       double precision not null,   -- bounding box, so "places near here" is a cheap range query
  north       double precision not null,
  west        double precision not null,
  east        double precision not null,
  pts         jsonb not null,              -- [lat, lng] points: one for a shop, an outline about 60 m apart for a park (distance is to this outline)
  closed      boolean not null default false, -- true when pts is one closed ring (so a point inside it is at distance 0)
  fetched_at  timestamptz not null default now()
);
create index places_search_idx on public.places using gin (search_tsv);
create index places_south_idx on public.places (south);

alter table public.places enable row level security;
create policy "anyone reads places" on public.places for select using (true);
-- No write policies: only the service role writes.
