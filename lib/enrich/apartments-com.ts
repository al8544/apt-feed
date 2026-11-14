// Apartments.com page -> photos and details (docs/DESIGN.md §6.2, ticket T5). Pure functions: no network, no database.
// Prefers the page's structured data (JSON-LD, og:image) over CSS selectors, which break whenever the layout changes.

export type MediaItem = { url: string; kind: 'photo' | 'floorplan' };
export type Parsed = {
  photos: MediaItem[];
  petsAllowed: boolean | null; // null = the page does not say
  amenities: string[];
  description: string | null;
};

// A page that is asking us to prove we are a person. We stop when we see one; we never try to get past it.
export function isBlocked(status: number, html: string): boolean {
  return [403, 429, 503].includes(status) || /captcha|px-captcha|access denied|are you a robot|unusual traffic|verify you are human/i.test(html.slice(0, 20000));
}

const LD = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const OG = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;

type Json = Record<string, unknown>;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function jsonLdNodes(html: string): Json[] {
  const nodes: Json[] = [];
  for (const m of html.matchAll(LD)) {
    try {
      for (const n of asArray(JSON.parse(m[1]!))) {
        if (!isObj(n)) continue;
        nodes.push(n, ...asArray(n['@graph']).filter(isObj)); // @graph wraps several nodes in one block
      }
    } catch {
      /* a broken block is normal; skip it */
    }
  }
  return nodes;
}

const httpsUrl = (u: unknown): string | null => {
  if (typeof u !== 'string') return null;
  const s = u.trim().replace(/^\/\//, 'https://').replace(/^http:\/\//, 'https://');
  return /^https:\/\/[^\s]+$/.test(s) ? s : null;
};

function imageUrls(v: unknown): { url: string; label: string }[] {
  return asArray(v).flatMap((x) => {
    if (typeof x === 'string') return httpsUrl(x) ? [{ url: httpsUrl(x)!, label: '' }] : [];
    if (isObj(x)) {
      const url = httpsUrl(x.url ?? x.contentUrl);
      return url ? [{ url, label: `${x.name ?? ''} ${x.caption ?? ''} ${x.description ?? ''}` }] : [];
    }
    return [];
  });
}

export function parse(html: string): Parsed {
  const nodes = jsonLdNodes(html);
  const seen = new Set<string>();
  const photos: MediaItem[] = [];
  const add = (url: string, label = '') => {
    if (seen.has(url)) return;
    seen.add(url);
    photos.push({ url, kind: /floor ?plan|floorplan/i.test(`${url} ${label}`) ? 'floorplan' : 'photo' });
  };

  for (const n of nodes) {
    for (const key of ['image', 'photo']) imageUrls(n[key]).forEach((i) => add(i.url, i.label));
  }
  for (const m of html.matchAll(OG)) {
    const u = httpsUrl(m[1]);
    if (u) add(u);
  }

  let petsAllowed: boolean | null = null;
  const amenities: string[] = [];
  let description: string | null = null;
  for (const n of nodes) {
    if (typeof n.petsAllowed === 'boolean') petsAllowed = n.petsAllowed;
    if (typeof n.description === 'string' && !description) description = n.description.trim().slice(0, 600) || null;
    for (const a of asArray(n.amenityFeature)) {
      if (!isObj(a) || typeof a.name !== 'string' || a.value === false) continue;
      amenities.push(a.name.trim());
      if (/^pets? allowed$|^pet friendly$/i.test(a.name.trim())) petsAllowed ??= true;
    }
  }
  return { photos, petsAllowed, amenities: [...new Set(amenities)].slice(0, 40), description };
}

// The kit's CDN url differs from a copy only by an image-size segment (/112/, /113/, /116/): treat those as one picture.
export const sameImage = (a: string, b: string) => a.replace(/\/11[236]\//, '/N/') === b.replace(/\/11[236]\//, '/N/');
