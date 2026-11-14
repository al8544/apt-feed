-- CoStar floor plans (docs/DESIGN.md §5.1). Additive: Brooklyn rows keep working untouched.
-- listings stays one real table (swipes, stash and tours point at it); new rows have source = 'costar'.

create table public.communities (          -- one apartment community (CoStar property)
  id                 uuid primary key default gen_random_uuid(),
  costar_property_id text not null unique,
  name               text,
  address            text,
  city               text,
  postal_code        text,
  lat                double precision,
  lng                double precision,
  neighborhood       text,                  -- the kit has none; derived later from a canonical LA list
  management_company text,
  primary_photo_url  text,
  raw                jsonb,                 -- original record, for debugging
  ingested_at        timestamptz not null default now()
);

alter table public.listings
  add column community_id        uuid references public.communities,
  add column costar_floorplan_id text,
  add column rent_min            int,        -- floor-plan rent range; price = rent_min
  add column rent_max            int,
  add column active              boolean not null default true,   -- ingest sets false for plans missing from a later kit; rows are never deleted
  add column raw                 jsonb,
  add constraint listings_floorplan_key unique (community_id, costar_floorplan_id);  -- Brooklyn rows have null community_id, so they never collide

-- The kit has neither a neighborhood nor a pet policy: both become "unknown" instead of a made-up value.
alter table public.listings
  alter column neighborhood drop not null,
  alter column pets drop not null,
  alter column pets drop default;

create index listings_source_idx on public.listings (source);
create index listings_community_idx on public.listings (community_id);

alter table public.communities enable row level security;
create policy "anyone reads communities" on public.communities for select using (true);
-- No write policies: only the service role (ingest script) writes, and it bypasses RLS.
