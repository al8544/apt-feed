-- Flock chat: one group conversation per flock, separate from the person-to-person `messages` table.
-- Only active members of the flock can read it or post, and you can only post as yourself. A person who leaves stops seeing it
-- (is_flock_member is checked on every read); their old messages stay for the others, shown without a name if their account is deleted.
create table public.flock_messages (
  id         uuid primary key default gen_random_uuid(),
  flock_id   uuid not null references public.flocks on delete cascade,
  sender_id  uuid references public.profiles on delete set null,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index flock_messages_flock_idx on public.flock_messages (flock_id, created_at);

alter table public.flock_messages enable row level security;
create policy "members read the flock chat" on public.flock_messages for select to authenticated
  using (public.is_flock_member(flock_id));
create policy "members post as themselves" on public.flock_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_flock_member(flock_id));

-- lib/api.ts subscribes to inserts for the current flock.
alter publication supabase_realtime add table public.flock_messages;
