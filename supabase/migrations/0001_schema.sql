-- Flock schema as the app uses it today (see lib/api.ts).
--
-- [verify] The hosted project's catalog could not be read with the public anon key (the schema endpoint
-- needs a secret key), so this file was reconstructed from lib/api.ts and the live data. Before trusting
-- it, diff it against the real thing:  supabase db dump --schema public  (or Dashboard > Database > Schema).

-- ---------- People and groups ----------
create table public.profiles (
  id            uuid primary key,          -- becomes auth.users.id when sign-in lands (docs/DESIGN.md §10); demo profiles have no auth user
  username      text not null unique,
  display_name  text not null,
  avatar_color  text not null default '#8B5CF6',
  bio           text,
  budget_max    int,                       -- max monthly rent this person accepts
  beds_min      int,
  pets          boolean,
  neighborhoods text[],
  move_in       date
);

create table public.groups (               -- a "flock"; the app has one, keyed by GROUP_ID in lib/api.ts
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.profiles on delete set null
);

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id  uuid not null references public.profiles on delete cascade,
  role     text not null default 'member',   -- 'admin' | 'member'
  primary key (group_id, user_id)
);

-- ---------- Listings and decisions ----------
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  source       text not null default 'seed',
  address      text not null,
  neighborhood text not null,
  price        int  not null,
  beds         int  not null,
  baths        numeric not null,
  sqft         int,
  pets         boolean not null default false,
  lat          double precision not null,
  lng          double precision not null,
  photos       text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create table public.swipes (               -- direction 'right' = like, 'left' = nope
  user_id    uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  direction  text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index swipes_listing_id_idx on public.swipes (listing_id);
create index swipes_created_at_idx on public.swipes (created_at);

create table public.stash (                -- personal bookmarks
  user_id    uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- Tours and messages ----------
create table public.tours (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  starts_at  timestamptz not null,
  created_by uuid references public.profiles on delete set null
);
create index tours_group_starts_idx on public.tours (group_id, starts_at);

create table public.tour_attendees (       -- who RSVP'd "going"
  tour_id uuid not null references public.tours on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (tour_id, user_id)
);

create table public.messages (             -- direct messages between two people, optionally about a listing
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles on delete cascade,
  recipient_id uuid not null references public.profiles on delete cascade,
  listing_id   uuid references public.listings on delete set null,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index messages_recipient_idx on public.messages (recipient_id, created_at);

-- ---------- Flock likes ----------
-- Everyone in a group who swiped right on a listing. security_invoker: the reader's row-level
-- security on swipes and group_members applies (see 0003_rls.sql).
create view public.group_likes with (security_invoker = true) as
select m.group_id,
       s.listing_id,
       count(*)::int         as likes,
       array_agg(s.user_id)  as liked_by
from public.swipes s
join public.group_members m on m.user_id = s.user_id
where s.direction = 'right'
group by m.group_id, s.listing_id;

-- ---------- Realtime ----------
-- lib/api.ts subscribes to inserts on messages and to every change on swipes.
alter publication supabase_realtime add table public.swipes, public.messages;
