-- Accounts made before handle_new_user (0009) existed have no profiles row, so flocks.created_by (a foreign key to
-- profiles) rejects their inserts. Give each of them the same row the trigger would have made. Safe to re-run.
insert into profiles (id, username, display_name, is_demo)
select u.id,
       coalesce(nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9._]', '', 'g'), ''), 'bird')
         || '-' || left(replace(u.id::text, '-', ''), 4),
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
                coalesce(nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9._]', '', 'g'), ''), 'bird')),
       false
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id)
on conflict (id) do nothing;
