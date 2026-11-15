// npm run dev:local: the app on port 3000, pointed at the local Supabase (supabase start) instead of the real project.
// Shell variables beat .env.local, so nothing in .env.local changes.
// Every start first resets the local data to a demo scenario (supabase/seeds/), so the app always opens in the same state:
//   npm run dev:local               in-flock (default): sign in as vinnie@flock.test / flock1234, already in a flock
//   npm run dev:local -- new-user   nobody signed in; sign up, then make a friends flock or join a suggested open one
import { spawn, spawnSync } from 'node:child_process';

const scenario = process.argv[2] ?? 'in-flock';
const r = spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' });
let status;
try {
  status = JSON.parse(r.stdout);
} catch {
  console.error('The local database is not running. Start it with:  supabase start   (Docker Desktop must be open)');
  process.exit(1);
}

if (spawnSync('node', ['scripts/seed-demo.mjs', scenario], { stdio: 'inherit' }).status !== 0) process.exit(1);
console.log(`Using the LOCAL database at ${status.API_URL}`);
const dev = spawn('npx', ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_DEMO: '0', // always real sign-in: signed out means the Welcome page
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, // server only: Find a flock computes matches with it
  },
});
dev.on('exit', (code) => process.exit(code ?? 0));
