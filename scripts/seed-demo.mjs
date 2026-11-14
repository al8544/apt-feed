// npm run db:seed [-- in-flock | new-user]: reset the LOCAL database's user data to a demo scenario (supabase/seeds/) and open anon access.
// Runs inside the local Supabase container, so it cannot touch the real project.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export const SCENARIOS = ['in-flock', 'new-user'];
const scenario = process.argv[2] ?? 'in-flock';
if (!SCENARIOS.includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Use one of: ${SCENARIOS.join(', ')}`);
  process.exit(1);
}

const files = ['supabase/seeds/base.sql', `supabase/seeds/${scenario}.sql`, 'supabase/dev-open-access.sql'];
const sql = `begin;\n${files.map((f) => readFileSync(f, 'utf8')).join('\n')}\ncommit;\n`;
const r = spawnSync('docker', ['exec', '-i', 'supabase_db_flock', 'psql', '-U', 'postgres', '-q', '-v', 'ON_ERROR_STOP=1'], {
  input: sql,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (r.status !== 0) {
  console.error('Demo seed failed (is `supabase start` running?).');
  process.exit(1);
}
console.log(`Demo data reset: ${scenario}.`);
