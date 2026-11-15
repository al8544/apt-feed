// npm run setup: start the local database (Docker) and build the schema from supabase/migrations. Safe to re-run.
import { spawnSync } from 'node:child_process';

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  console.error('Docker is not running. Install and open Docker Desktop, wait until it says "running", then retry.');
  process.exit(1);
}
// First run downloads a few GB of images and applies every migration; later runs return in seconds.
if (spawnSync('npx', ['supabase', 'start'], { stdio: 'inherit' }).status !== 0) process.exit(1);
console.log('\nLocal database is up. Next: load the listings (npm run db:ingest), then npm run dev:local.');
