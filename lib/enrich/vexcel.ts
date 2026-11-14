// Vexcel aerial evidence (docs/DESIGN.md §6.3, ticket T14). Plain fetch, no SDK. The key is VEXCEL_API_KEY, server and scripts only.
// Endpoints (confirmed against Vexcel's hackathon tutorial and live calls, see §6.3):
//   GET  /v2/property/extract   parcels around a point with flat attributes (pool.detected, parcel-tree-cover.percent, ...)
//   POST /v2/elements/detect    names a thing ("swimming pool") and finds it in the imagery, with a 0-1 confidence
// Nothing here throws: every failure comes back as { ok: false, reason }, so callers can say "aerial check unavailable".

export type Reason = 'no_key' | 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limited' | 'timeout' | 'network' | 'server_error' | 'bad_response';
export type Result<T> = { ok: true; value: T } | { ok: false; reason: Reason };

const LAYERS = 'urban,urban-r,wide-area,urban-g'; // the best imagery available at each place
const BASE_URL = 'https://api.vexcelgroup.com/v2';
export const DETECT_THRESHOLD = 0.5; // the tutorial's default; lower finds more and noisier objects

// ---------- what a visual phrase can mean ----------
// Vexcel's detector is open-vocabulary: it finds anything you can NAME in the imagery. So a wish is not limited to a fixed list: the model may
// propose any label for something visible from above (a basketball court, solar panels, a rooftop deck, a lawn), and this vets it. What it cannot be:
// a feeling ("quiet"), something indoors ("natural light", "dishwasher"), or a number ("2 bathrooms"). Whether the detector actually recognises a
// label is only known by trying it, which is why lib/agent/ducktect.ts flags a label that no place showed.
const ALIASES: Record<string, string> = {
  pool: 'swimming pool', pools: 'swimming pool', 'swimming pool': 'swimming pool', 'swimming pools': 'swimming pool',
  tennis: 'tennis court', 'tennis courts': 'tennis court', 'basketball courts': 'basketball court', 'parking lots': 'parking lot',
  'solar panel': 'solar panels', 'rooftop deck': 'rooftop deck', 'roof deck': 'rooftop deck', 'roof terrace': 'rooftop deck',
  trees: 'tree cover', tree: 'tree cover', greenery: 'tree cover', 'tree canopy': 'tree cover', shade: 'tree cover', 'tree cover': 'tree cover',
  lawn: 'grass lawn', grass: 'grass lawn', lawns: 'grass lawn', 'green lawn': 'grass lawn', yard: 'grass lawn', 'back yard': 'grass lawn', backyard: 'grass lawn',
};
export const ATTRIBUTE_PHRASES = ['tree cover'] as const; // read from the property attributes, not detected
export const MAX_IMAGERY_LABELS = 3; // each label adds work to the detector; a wish rarely needs more
export const normalizePhrase = (s: string) => s.toLowerCase().replace(/[^a-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim();

const SIZE_WORDS = new Set(['big', 'large', 'huge', 'small', 'tiny', 'nice', 'beautiful', 'private', 'good', 'great', 'lots', 'of', 'a', 'an', 'the', 'some']);
// Words that make a "visual" phrase a feeling, something indoors, or a number: not a thing the detector can find from above.
const FEELINGS = new Set([
  'quiet', 'safe', 'sunny', 'bright', 'walkable', 'cozy', 'modern', 'luxury', 'luxurious', 'clean', 'friendly', 'vibe', 'noise', 'noisy', 'spacious', 'peaceful', 'cheap', 'affordable', 'charming',
  'rent', 'price', 'deal', 'close', 'near', 'nearby', 'walk', 'neighbors', 'neighborhood', 'pet', 'pets', 'doorman', 'concierge', 'wifi', 'internet', 'heating', 'air', 'conditioning',
]);
// Things that live indoors: not visible from above, unless the phrase says it is outside ("outdoor kitchen", "rooftop lounge").
const INDOOR = new Set(['light', 'view', 'views', 'dishwasher', 'laundry', 'kitchen', 'bedroom', 'bedrooms', 'bathroom', 'bathrooms', 'closet', 'appliances', 'floors', 'flooring', 'carpet', 'inside', 'indoor', 'lounge']);
const OUTSIDE = new Set(['outdoor', 'outside', 'rooftop', 'roof', 'patio', 'backyard', 'courtyard', 'terrace']);

// The label to hand the detector, or null when the phrase is not something imagery can show.
export function canonicalPhrase(s: string): string | null {
  const n = normalizePhrase(s);
  if (!n) return null;
  if (ALIASES[n]) return ALIASES[n]!;
  const words = n.split(' ').filter((w) => !SIZE_WORDS.has(w));
  const label = words.join(' ');
  if (!label || ALIASES[label]) return label ? ALIASES[label]! : null;
  if (words.length > 4 || label.length > 40 || !/[a-z]/.test(label) || /\d/.test(label)) return null;
  const outside = words.some((w) => OUTSIDE.has(w));
  return words.some((w) => FEELINGS.has(w) || (INDOOR.has(w) && !outside)) || /^\d/.test(label) ? null : label;
}
export const isAttributePhrase = (p: string) => (ATTRIBUTE_PHRASES as readonly string[]).includes(p);

// ---------- geometry ----------
// WKT is longitude first: POINT(lng lat). The number-one Vexcel mistake is swapping them.
export const pointWkt = (lat: number, lng: number) => `POINT(${lng} ${lat})`;
// A square centred on the point; halfM is the distance from the centre to each edge (the tutorial's square_around).
export function squareWkt(lat: number, lng: number, halfM: number): string {
  const dlat = halfM / 111_320, dlng = halfM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const [w, e, s, n] = [lng - dlng, lng + dlng, lat - dlat, lat + dlat].map((x) => Number(x.toFixed(7)));
  return `POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`;
}

// ---------- parsing (pure; tested with canned responses) ----------
type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export type Imagery = { collection: string | null; capturedAt: string | null }; // which flight, and when it was taken
export type DetectSummary = { imagery: Imagery | null; byLabel: Record<string, { count: number; maxConfidence: number }> };

// A label with no detections has NO feature in the response, so "not in the answer" means "looked and saw none".
export function parseDetect(json: unknown, labels: string[]): DetectSummary | null {
  if (!isObj(json) || !Array.isArray(json.features)) return null;
  const byLabel: DetectSummary['byLabel'] = Object.fromEntries(labels.map((l) => [l, { count: 0, maxConfidence: 0 }]));
  for (const f of json.features) {
    const p = isObj(f) && isObj(f.properties) ? f.properties : null;
    const label = typeof p?.label === 'string' ? p.label : null;
    if (!p || !label || !byLabel[label] || !Array.isArray(p.detections)) continue;
    for (const d of p.detections) {
      const c = isObj(d) ? num(d.confidence) : null;
      if (c == null) continue;
      byLabel[label].count += 1;
      byLabel[label].maxConfidence = Math.max(byLabel[label].maxConfidence, c);
    }
  }
  const meta = Array.isArray(json.images) && isObj(json.images[0]) && isObj(json.images[0].metadata) ? json.images[0].metadata : null;
  const ms = num(meta?.['last-capture-date']);
  const imagery: Imagery | null = meta
    ? { collection: typeof meta.collection === 'string' ? meta.collection : null, capturedAt: ms == null ? null : new Date(ms).toISOString().slice(0, 10) }
    : null;
  return { imagery, byLabel: byLabel };
}

// What we keep from the ~90 KB property answer (listing_enrichment.vexcel_attributes): small, flat, and honest about its limits.
export type PropertyAttributes = {
  parcels: number; // how many parcels came back for the point (an apartment complex is often several)
  pool: { detected: boolean; maxScore: number | null }; // true if ANY parcel shows one
  treeCoverPct: number | null; // median across parcels; the inside-parcel flag cannot pick one (Vexcel marks all of them true)
  treeCoverMaxPct: number | null;
  collection: string | null;
};

export function parseProperty(json: unknown): PropertyAttributes | null {
  if (!isObj(json) || !Array.isArray(json.features) || !json.features.length) return null;
  const props = json.features.map((f) => (isObj(f) && isObj(f.properties) ? f.properties : null)).filter((p): p is Json => p !== null);
  if (!props.length) return null;
  const pools = props.filter((p) => p['pool.detected'] === true);
  const trees = props.map((p) => num(p['parcel-tree-cover.percent'])).filter((x): x is number => x != null);
  const scores = pools.map((p) => num(p['pool.score'])).filter((x): x is number => x != null);
  return {
    parcels: props.length,
    pool: { detected: pools.length > 0, maxScore: scores.length ? Math.max(...scores) : null },
    treeCoverPct: median(trees),
    treeCoverMaxPct: trees.length ? Math.max(...trees) : null,
    collection: typeof props[0]!['metadata.collection'] === 'string' ? (props[0]!['metadata.collection'] as string) : null,
  };
}

// ---------- the client ----------
export type VexcelOptions = {
  apiKey?: string;
  fetch?: typeof fetch; // swappable so tests use canned responses and never touch the network
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number; // extra tries after a 429, with 1 s, 2 s, 4 s waits (the tutorial's advice)
  sleep?: (ms: number) => Promise<void>;
};

const STATUS_REASON: Record<number, Reason> = { 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 429: 'rate_limited' };

export function createVexcel(opts: VexcelOptions = {}) {
  const key = opts.apiKey ?? process.env.VEXCEL_API_KEY;
  const doFetch = opts.fetch ?? fetch;
  const base = opts.baseUrl ?? BASE_URL;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const maxRetries = opts.maxRetries ?? 2;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  async function send(method: 'GET' | 'POST', path: string, init: { params?: Record<string, string>; body?: unknown }): Promise<Result<unknown>> {
    if (!key) return { ok: false, reason: 'no_key' };
    const url = new URL(`${base}/${path}`);
    for (const [k, v] of Object.entries(init.params ?? {})) url.searchParams.set(k, v);
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        // The key goes in a header, never the URL (it would end up in logs).
        res = await doFetch(url, {
          method,
          headers: { 'X-API-KEY': key, ...(init.body ? { 'content-type': 'application/json' } : {}) },
          body: init.body ? JSON.stringify(init.body) : undefined,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        return { ok: false, reason: (e as Error).name === 'TimeoutError' || (e as Error).name === 'AbortError' ? 'timeout' : 'network' };
      }
      if (res.status === 429 && attempt < maxRetries) { await sleep(1000 * 2 ** attempt); continue; }
      if (!res.ok) return { ok: false, reason: STATUS_REASON[res.status] ?? (res.status >= 500 ? 'server_error' : 'bad_response') };
      try {
        return { ok: true, value: await res.json() };
      } catch {
        return { ok: false, reason: 'bad_response' };
      }
    }
  }

  return {
    // Pool and tree cover of the parcels around a point (a trimmed include: the full answer is ~90 KB, and structure.count reads 0 unless
    // structures are requested, so it is not kept). 404 = no property record there (a road, outside coverage).
    async property(lat: number, lng: number): Promise<Result<PropertyAttributes>> {
      const r = await send('GET', 'property/extract', {
        params: { wkt: pointWkt(lat, lng), srid: '4326', layer: LAYERS, latest: 'true', include: 'pool,parcel-tree-cover,metadata', 'unit-system': 'imperial' },
      });
      if (!r.ok) return r;
      const parsed = parseProperty(r.value);
      return parsed ? { ok: true, value: parsed } : { ok: false, reason: 'bad_response' };
    },

    // Finds each label on the imagery of a square around the point, in ONE call. Keep halfM small: big areas are silently downsampled.
    async detect(lat: number, lng: number, labels: string[], o: { halfM?: number; threshold?: number } = {}): Promise<Result<DetectSummary>> {
      const wkt = squareWkt(lat, lng, o.halfM ?? 80);
      const r = await send('POST', 'elements/detect', {
        body: {
          wkt, srid: 4326, 'buffer-meter': 0,
          images: [{ endpoint: 'ortho/extract', request: { layer: LAYERS, srid: 4326, wkt, crop: 'bounding_box' } }],
          // No pixel masks: we only need whether and how sure, and masks make the answer large.
          'model-input': { elements: labels.map((label) => ({ label, model: 'sam3', 'detection-threshold': o.threshold ?? DETECT_THRESHOLD })), include: ['bbox', 'confidence'] },
        },
      });
      if (!r.ok) return r;
      const parsed = parseDetect(r.value, labels);
      return parsed ? { ok: true, value: parsed } : { ok: false, reason: 'bad_response' };
    },
  };
}
export type Vexcel = ReturnType<typeof createVexcel>;
