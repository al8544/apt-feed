// Aerial evidence for a community, cache first (docs/DESIGN.md §6.3, ticket T14). This is what Ducktect's aerial-evidence step (T15) calls.
// Order of work: the cache (aerial_queries, listing_enrichment) -> Vexcel for what is missing, if allowed and within budget -> "unavailable".
// It never throws and never invents: no cache and no live answer means "aerial check unavailable", and the wording never claims more than
// imagery shows ("not confirmed as a resident amenity").
import type { SupabaseClient } from '@supabase/supabase-js';
import { DETECT_THRESHOLD, canonicalPhrase, isAttributePhrase, type DetectSummary, type Imagery, type PropertyAttributes, type Reason, type Vexcel } from './vexcel.ts';

export const DEFAULT_BUFFER_M = 80; // half the side of the square searched around a community, in metres

export type Evidence = {
  phrase: string; // the canonical phrase, or what was asked when it cannot be checked
  status: 'found' | 'not_seen' | 'unavailable' | 'not_checkable';
  text: string;
  confidence: number | null; // Vexcel's 0-1 detection confidence (found / not_seen from detection); null otherwise
  imagery: Imagery | null; // which flight and when, for the evidence card
  source: 'cache' | 'live' | 'osm' | null; // 'osm': read from the OpenStreetMap places in the database (lib/enrich/places.ts)
  meters?: number | null; // for a place found around a home: how far it is, so closer can score better
};

export type QueryRow = {
  phrase: string;
  result: { method: 'detect'; found: boolean; count: number; maxConfidence: number; threshold: number; imagery: Imagery | null };
  score: number | null;
};

// ---------- storage: an interface so tests need no database (the same pattern as lib/agent/store.ts) ----------
export interface AerialStore {
  queries(communityId: string, bufferM: number, phrases: string[]): Promise<QueryRow[]>;
  saveQueries(communityId: string, bufferM: number, rows: QueryRow[]): Promise<void>;
  attributes(communityId: string): Promise<PropertyAttributes | null>;
  saveAttributes(communityId: string, attrs: PropertyAttributes): Promise<void>;
}

const fail = (r: { error: { message: string } | null }, what: string) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
};

// Reads work with any client (the tables are public to read); writes need the service role.
export function supabaseAerialStore(db: SupabaseClient): AerialStore {
  return {
    async queries(communityId, bufferM, phrases) {
      const r = await db.from('aerial_queries').select('phrase, result, score').eq('community_id', communityId).eq('buffer_m', bufferM).in('phrase', phrases);
      fail(r, 'aerial_queries');
      return (r.data ?? []) as QueryRow[];
    },
    async saveQueries(communityId, bufferM, rows) {
      if (!rows.length) return;
      const r = await db.from('aerial_queries').upsert(
        rows.map((x) => ({ community_id: communityId, buffer_m: bufferM, phrase: x.phrase, result: x.result, score: x.score, fetched_at: new Date().toISOString() })),
        { onConflict: 'community_id,phrase,buffer_m' }
      );
      fail(r, 'aerial_queries');
    },
    async attributes(communityId) {
      const r = await db.from('listing_enrichment').select('vexcel_attributes').eq('community_id', communityId).maybeSingle();
      fail(r, 'listing_enrichment');
      return ((r.data as { vexcel_attributes: PropertyAttributes | null } | null)?.vexcel_attributes ?? null) as PropertyAttributes | null;
    },
    async saveAttributes(communityId, attrs) {
      // Only the Vexcel columns: the Apartments.com column of the same row is left alone.
      const r = await db.from('listing_enrichment').upsert({ community_id: communityId, vexcel_attributes: attrs, last_checked: new Date().toISOString() }, { onConflict: 'community_id' });
      fail(r, 'listing_enrichment');
    },
  };
}

export function memoryAerialStore(): AerialStore & { rows: Map<string, QueryRow>; attrs: Map<string, PropertyAttributes> } {
  const rows = new Map<string, QueryRow>(), attrs = new Map<string, PropertyAttributes>();
  const k = (c: string, b: number, p: string) => `${c}|${b}|${p}`;
  return {
    rows, attrs,
    async queries(c, b, phrases) { return phrases.flatMap((p) => (rows.has(k(c, b, p)) ? [rows.get(k(c, b, p))!] : [])); },
    async saveQueries(c, b, list) { for (const x of list) rows.set(k(c, b, x.phrase), x); },
    async attributes(c) { return attrs.get(c) ?? null; },
    async saveAttributes(c, a) { attrs.set(c, a); },
  };
}

// One row of the cache from a detect answer. A label with no detections is still a real answer ("looked, saw none") and is cached.
export const toRow = (phrase: string, s: DetectSummary): QueryRow => {
  const hit = s.byLabel[phrase] ?? { count: 0, maxConfidence: 0 };
  return { phrase, score: hit.maxConfidence, result: { method: 'detect', found: hit.count > 0, count: hit.count, maxConfidence: hit.maxConfidence, threshold: DETECT_THRESHOLD, imagery: s.imagery } };
};

// ---------- wording (§6.3: evidence, never a claim about residents) ----------
// "a basketball court", "an outdoor kitchen", and no article for plurals or masses ("solar panels", "grass lawn" reads fine with one, but "solar panels" does not).
const withArticle = (label: string) => (/s$/.test(label) && !/(ss|us)$/.test(label) ? label : `${/^[aeiou]/.test(label) ? 'an' : 'a'} ${label}`);

export function evidenceFromQuery(phrase: string, row: QueryRow, source: 'cache' | 'live'): Evidence {
  const found = row.result.found;
  return {
    phrase, status: found ? 'found' : 'not_seen', confidence: row.score, imagery: row.result.imagery, source,
    text: found
      ? `Aerial imagery suggests ${withArticle(phrase)} nearby (not confirmed as a resident amenity).`
      : `No ${phrase} seen in aerial imagery around this property (imagery cannot rule it out).`,
  };
}

export function evidenceFromAttributes(attrs: PropertyAttributes, source: 'cache' | 'live'): Evidence {
  const imagery: Evidence['imagery'] = attrs.collection ? { collection: attrs.collection, capturedAt: null } : null;
  if (attrs.treeCoverPct == null) return { phrase: 'tree cover', status: 'unavailable', text: 'Aerial check unavailable.', confidence: null, imagery, source };
  const pct = Math.round(attrs.treeCoverPct);
  if (pct < 1) return { phrase: 'tree cover', status: 'not_seen', confidence: null, imagery, source, text: 'No tree cover seen on the lots around this property (imagery cannot rule it out).' };
  return { phrase: 'tree cover', status: 'found', confidence: null, imagery, source, text: `Aerial imagery suggests about ${pct}% tree cover on the lots around this property.` };
}

const unavailable = (phrase: string): Evidence => ({ phrase, status: 'unavailable', text: 'Aerial check unavailable.', confidence: null, imagery: null, source: null });
const notCheckable = (phrase: string): Evidence => ({ phrase, status: 'not_checkable', text: "Can't be checked from aerial imagery.", confidence: null, imagery: null, source: null });

// ---------- the one entry point ----------
export type Community = { id: string; lat: number; lng: number };
export type EvidenceOptions = {
  store: AerialStore;
  vexcel?: Vexcel; // leave out for cache-only (the default for anything that serves a page)
  bufferM?: number;
  budget?: { calls: number }; // Vexcel calls this request may still make; shared across communities and decremented here
  onFailure?: (call: 'detect' | 'property', reason: Reason) => void; // why a live call failed (the evidence itself only says "unavailable")
};

export async function aerialEvidence(community: Community, phrases: string[], opts: EvidenceOptions): Promise<Evidence[]> {
  const buffer = opts.bufferM ?? DEFAULT_BUFFER_M;
  const wanted = phrases.map((raw) => ({ raw, phrase: canonicalPhrase(raw) }));
  const detectPhrases = [...new Set(wanted.flatMap((w) => (w.phrase && !isAttributePhrase(w.phrase) ? [w.phrase] : [])))]; // anything nameable goes to the detector
  const wantsTrees = wanted.some((w) => w.phrase === 'tree cover');

  const detected = new Map<string, Evidence>();
  let treeEvidence: Evidence | null = null;

  try {
    // 1. the cache
    const cached = detectPhrases.length ? await opts.store.queries(community.id, buffer, detectPhrases) : [];
    for (const row of cached) detected.set(row.phrase, evidenceFromQuery(row.phrase, row, 'cache'));
    const cachedAttrs = wantsTrees ? await opts.store.attributes(community.id) : null;
    if (cachedAttrs) treeEvidence = evidenceFromAttributes(cachedAttrs, 'cache');

    // 2. Vexcel for what is missing, if allowed. One detect call covers every missing label; a failed call is never cached.
    const missing = detectPhrases.filter((p) => !detected.has(p));
    const take = () => !!opts.vexcel && (!opts.budget || opts.budget.calls-- > 0);
    if (missing.length && take()) {
      const r = await opts.vexcel!.detect(community.lat, community.lng, missing, { halfM: buffer });
      if (r.ok) {
        const rows = missing.map((p) => toRow(p, r.value));
        await opts.store.saveQueries(community.id, buffer, rows);
        for (const row of rows) detected.set(row.phrase, evidenceFromQuery(row.phrase, row, 'live'));
      } else opts.onFailure?.('detect', r.reason);
    }
    if (wantsTrees && !treeEvidence && take()) {
      const r = await opts.vexcel!.property(community.lat, community.lng);
      if (r.ok) {
        await opts.store.saveAttributes(community.id, r.value);
        treeEvidence = evidenceFromAttributes(r.value, 'live');
      } else opts.onFailure?.('property', r.reason);
    }
  } catch {
    /* a storage or network problem must not break the caller: whatever is still missing reads as unavailable below */
  }

  return wanted.map(({ raw, phrase }) =>
    !phrase ? notCheckable(raw) : phrase === 'tree cover' ? (treeEvidence ?? unavailable(phrase)) : (detected.get(phrase) ?? unavailable(phrase))
  );
}
