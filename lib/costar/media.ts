// Gallery photos from a CoStar property record's attachments[] (docs: kit models/commercial-property.md).
// The kit already holds real galleries: 30,961 stills across the 767 LA communities (median 33 each). No scraping needed.
import { photoUrl } from './map.ts';
import { sameImage } from '../enrich/apartments-com.ts';

export type KitAttachment = {
  attachmentType?: number | null;
  attachmentTypeExtension?: number | null; // 6 = Jpg, 9 = Png
  attachmentUri?: string | null;
  videoExternalReferenceType?: number | null; // 0 still image, 60 plan made from a document, 36/234 Matterport
  dimensions?: { width?: number | null; height?: number | null } | null;
};

// Every photo of the community that belongs in a gallery (no cap by default), best first: building, interior, lobby, aerial.
// Left out on purpose: floor plans, plat maps, site plans, brochures and other documents.
const PRIORITY: Record<number, number> = { 4: 0, 33: 1, 6: 2, 1: 3 };
const MIN_WIDTH = 600; // skip thumbnails and logos

export function pickGallery(attachments: KitAttachment[] | null | undefined, primaryUrl?: string | null, max = Infinity): string[] {
  const kept = (attachments ?? [])
    .filter(
      (a) =>
        a.attachmentUri &&
        (a.videoExternalReferenceType ?? 0) === 0 &&
        [6, 9].includes(a.attachmentTypeExtension ?? 0) &&
        a.attachmentType != null && a.attachmentType in PRIORITY &&
        (a.dimensions?.width ?? MIN_WIDTH) >= MIN_WIDTH,
    )
    .map((a, i) => ({ url: photoUrl(a.attachmentUri)!, rank: PRIORITY[a.attachmentType!]!, i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i); // stable within a type
  const out: string[] = [];
  for (const { url } of kept) {
    if (primaryUrl && sameImage(url, primaryUrl)) continue; // the card already starts with the primary photo
    if (out.some((u) => sameImage(u, url))) continue;
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}
