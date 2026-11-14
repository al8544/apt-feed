// Reading the CoStar data kit (docs/DESIGN.md §6.1). Never commit the zip, its password or the extracted files:
// data/ and .cache/ are gitignored.
import { createReadStream, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

export const APARTMENT_FILE = 'data/apartment-listing.jsonl';

// Extract only the files we read from the zip into outDir (a new, empty-ish folder under data/).
// The system `unzip` is used because Node has no built-in zip with a password.
export function extractKit(zipPath: string, password: string, outDir: string, files: string[] = [APARTMENT_FILE]): void {
  const r = spawnSync('unzip', ['-q', '-o', '-P', password, zipPath, ...files, '-d', outDir], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`unzip failed (${r.status}): ${r.stderr.trim() || r.stdout.trim()}`);
}

export type KitLine<T> = { line: number; record: T } | { line: number; error: string };

// Streams the JSONL one line at a time (the file is ~6 MB, but other kit files are hundreds of MB).
export async function* readJsonl<T>(path: string): AsyncGenerator<KitLine<T>> {
  if (!existsSync(path)) throw new Error(`Kit file not found: ${path}. Extract the kit into data/ first.`);
  let line = 0;
  for await (const text of createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity })) {
    line++;
    if (!text.trim()) continue;
    try {
      yield { line, record: JSON.parse(text) as T };
    } catch (e) {
      yield { line, error: (e as Error).message };
    }
  }
}

export const apartmentFile = (kitDir: string) => join(kitDir, APARTMENT_FILE);
