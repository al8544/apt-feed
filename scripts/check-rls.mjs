// Checks what the PUBLIC anon key can do against the project in .env.local: read and write another person's
// private rows. Exits 1 if anything it should not be able to do succeeds.   node scripts/check-rls.mjs
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const call = (method, path, body) =>
  fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body && JSON.stringify(body),
  }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => null) }));

const PRIVATE = ['profiles', 'groups', 'group_members', 'swipes', 'stash', 'tours', 'tour_attendees', 'messages'];
let bad = 0;
const report = (ok, text) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${text}`), ok || bad++);

for (const t of PRIVATE) {
  const r = await call('GET', `${t}?select=*&limit=1`);
  report(!(r.ok && r.data?.length), `anon cannot read ${t}${r.ok && r.data?.length ? ' (it can)' : ''}`);
}
const l = await call('GET', 'listings?select=id&limit=1');
report(l.ok && l.data?.length > 0, 'anon can read listings (public property data)');

// Write as somebody else, then clean up whatever got through.
const [person] = (await call('GET', 'profiles?select=id&limit=2')).data ?? [];
const listing = l.data?.[0]?.id;
if (person && listing) {
  const row = { user_id: person.id, listing_id: listing };
  const exists = (await call('GET', `stash?user_id=eq.${row.user_id}&listing_id=eq.${listing}`)).data?.length;
  if (!exists) {
    const w = await call('POST', 'stash', row);
    report(!w.ok, `anon cannot write another user's stash${w.ok ? ' (it can)' : ''}`);
    if (w.ok) await call('DELETE', `stash?user_id=eq.${row.user_id}&listing_id=eq.${listing}`);
  }
} else {
  console.log('skip  write check: needs at least one readable profile and listing (private tables look locked, which is the goal)');
}
console.log(bad ? `\n${bad} check(s) failed: RLS is not protecting private rows.` : '\nAll checks passed.');
process.exit(bad ? 1 : 0);
