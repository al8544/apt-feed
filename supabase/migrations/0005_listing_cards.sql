-- One card per community (docs/DESIGN.md §2.3, §15 decision 10): the map and the swipe deck read this view,
-- so 767 LA communities show up instead of 6,543 floor plans. Votes stay on the floor plan (listings.id).
-- For now the card is the community's cheapest active floor plan; "best fit for the flock" comes with matching (T7).
create view public.listing_cards with (security_invoker = true) as
select distinct on (l.community_id)
  l.id, l.address, l.neighborhood, l.price, l.beds, l.baths, l.sqft, l.pets, l.lat, l.lng, l.photos,
  l.community_id, c.name as community_name
from public.listings l
join public.communities c on c.id = l.community_id
where l.source = 'costar' and l.active
order by l.community_id, l.price, l.beds, l.id;
