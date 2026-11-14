// npm run dev:local: the app on port 3000, pointed at the local Supabase (supabase start) instead of the real project.
// Shell variables beat .env.local, so nothing in .env.local changes.
import { spawn, spawnSync } from 'node:child_process';

const r = spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' });
let status;
try {
  status = JSON.parse(r.stdout);
} catch {
  console.error('The local database is not running. Start it with:  supabase start   (Docker Desktop must be open)');
  process.exit(1);
}

console.log(`Using the LOCAL database at ${status.API_URL}`);
const dev = spawn('npx', ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, // server only: Find a flock computes matches with it
  },
});
dev.on('exit', (code) => process.exit(code ?? 0));
