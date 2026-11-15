// Redfin-style clustering for map pins: points that land in the same square (about `cellPx` screen pixels wide at this zoom; raise it to merge more) become one group, shown
// as a count. Pure; the map page calls it on every zoom change.
// shortcut: cells are square in degrees, so they get slightly narrower in height away from the equator; fine for one city, use a real
// projection or supercluster if the map ever spans countries.
export type Pt = { lat: number; lng: number };
export type Cluster<T extends Pt> = Pt & { items: T[] };

export const CLUSTER_MAX_ZOOM = 15; // at this zoom and closer every point stands alone

export function cluster<T extends Pt>(items: T[], zoom: number, keep: (t: T) => boolean = () => false, cellPx = 120): Cluster<T>[] {
  const alone = (t: T): Cluster<T> => ({ lat: t.lat, lng: t.lng, items: [t] });
  if (zoom >= CLUSTER_MAX_ZOOM) return items.map(alone);
  const cell = (cellPx * 360) / (256 * 2 ** zoom); // degrees per cell
  const cells = new Map<string, T[]>();
  const out: Cluster<T>[] = [];
  for (const t of items) {
    if (keep(t)) { out.push(alone(t)); continue; } // a selected or ranked place is never swallowed
    const key = `${Math.floor(t.lng / cell)}:${Math.floor(t.lat / cell)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(t);
  }
  for (const group of cells.values()) {
    out.push({ lat: group.reduce((s, t) => s + t.lat, 0) / group.length, lng: group.reduce((s, t) => s + t.lng, 0) / group.length, items: group });
  }
  return out;
}
