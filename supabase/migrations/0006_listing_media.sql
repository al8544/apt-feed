-- Galleries and extra details from Apartments.com (docs/DESIGN.md §5.2, §6.2, ticket T5). Additive.
create table public.listing_media (
  id                uuid primary key default gen_random_uuid(),
  community_id      uuid not null references public.communities on delete cascade,
  url               text not null,
  kind              text not null default 'photo' check (kind in ('photo', 'floorplan')),
  position          int  not null default 0,
  source            text not null check (source in ('costar_kit', 'apartments_com')),
  source_page_url   text,                 -- where it came from; shown as the photo credit
  match_confidence  real,                 -- 1 = a person confirmed the page is this community
  fetched_at        timestamptz not null default now(),
  unique (community_id, url)
);
create index listing_media_community_idx on public.listing_media (community_id, position);

create table public.listing_enrichment (  -- one row per community; Vexcel columns arrive with T14
  community_id      uuid primary key references public.communities on delete cascade,
  apartments_com    jsonb,                -- { petsAllowed, amenities[], description, pageUrl }
  vexcel_attributes jsonb,
  last_checked      timestamptz not null default now()
);

alter table public.listing_media      enable row level security;
alter table public.listing_enrichment enable row level security;
create policy "anyone reads listing media" on public.listing_media for select using (true);
create policy "anyone reads listing enrichment" on public.listing_enrichment for select using (true);
-- No write policies: only the service role (the enrich script) writes.

-- Cards: the kit's primary photo first, then any enriched photos; with no media this is exactly what it was before.
-- photo_credit_url links the "Photo: Apartments.com" credit.
create or replace view public.listing_cards with (security_invoker = true) as
select distinct on (l.community_id)
  l.id, l.address, l.neighborhood, l.price, l.beds, l.baths, l.sqft, l.pets, l.lat, l.lng,
  coalesce(l.photos, '{}') || coalesce(
    array(select m.url from public.listing_media m
          where m.community_id = l.community_id and m.kind = 'photo' and m.source = 'apartments_com'
          order by m.position, m.url), '{}') as photos,
  l.community_id, c.name as community_name,
  (select m.source_page_url from public.listing_media m
   where m.community_id = l.community_id and m.source = 'apartments_com' and m.source_page_url is not null
   order by m.position limit 1) as photo_credit_url
from public.listings l
join public.communities c on c.id = l.community_id
where l.source = 'costar' and l.active
order by l.community_id, l.price, l.beds, l.id;
