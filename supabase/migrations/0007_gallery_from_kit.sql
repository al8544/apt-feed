-- Cards now show the kit gallery too: primary photo first, then kit photos, then any Apartments.com ones.
-- photo_credit_url is unchanged (only Apartments.com photos carry a credit link).
create or replace view public.listing_cards with (security_invoker = true) as
select distinct on (l.community_id)
  l.id, l.address, l.neighborhood, l.price, l.beds, l.baths, l.sqft, l.pets, l.lat, l.lng,
  coalesce(l.photos, '{}') || coalesce(
    array(select m.url from public.listing_media m
          where m.community_id = l.community_id and m.kind = 'photo'
          order by (m.source <> 'costar_kit'), m.position, m.url), '{}') as photos,
  l.community_id, c.name as community_name,
  (select m.source_page_url from public.listing_media m
   where m.community_id = l.community_id and m.source = 'apartments_com' and m.source_page_url is not null
   order by m.position limit 1) as photo_credit_url
from public.listings l
join public.communities c on c.id = l.community_id
where l.source = 'costar' and l.active
order by l.community_id, l.price, l.beds, l.id;
