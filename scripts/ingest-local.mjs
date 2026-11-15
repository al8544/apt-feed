// npm run db:ingest -- <kit.zip> <zip-password>   (or no args if the kit is already extracted into data/costar-kit)
// Loads the CoStar listings into the LOCAL database only.
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' });
let status;
try { status = JSON.parse(r.stdout); } catch { console.error('The local database is not running. Run: npm run setup'); process.exit(1); }

const [zip, password] = process.argv.slice(2);
const env = {
  ...process.env,
  INGEST_SUPABASE_URL: status.API_URL,
  INGEST_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  ...(zip && { COSTAR_KIT_ZIP: zip, COSTAR_ZIP_PASSWORD: password }),
};
const host = new URL(status.API_URL).host;
process.exit(spawnSync('node', ['scripts/ingest-costar.ts', '--write', '--confirm', host], { stdio: 'inherit', env }).status ?? 1);
