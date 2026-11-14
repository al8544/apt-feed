// Request validation for POST /api/flocks (docs/DESIGN.md §9). Pure, so it is tested without a server.
export type CreateFlock = {
  name: string;
  kind: 'friends' | 'open';
  about: string | null;
  looking_for: string | null;
  open_to_join: boolean;
  join_rules: { budget?: boolean; beds_movein?: boolean; areas?: boolean };
  max_size: number | null;
  bedrooms_needed: number | null;
  filters: Record<string, unknown>;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string | null | undefined =>
  v == null ? null : typeof v === 'string' && v.length <= max ? v.trim() || null : undefined; // undefined = invalid

export function parseCreateFlock(body: unknown): { ok: true; value: CreateFlock } | { ok: false; error: string } {
  if (!isObj(body)) return { ok: false, error: 'Send a JSON object.' };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 80) return { ok: false, error: 'name must be 1 to 80 characters.' };
  const kind = body.kind ?? 'friends';
  if (kind !== 'friends' && kind !== 'open') return { ok: false, error: 'kind must be "friends" or "open".' };
  const max = body.max_size ?? null;
  if (max !== null && (!Number.isInteger(max) || (max as number) < 2 || (max as number) > 50)) return { ok: false, error: 'max_size must be a whole number from 2 to 50, or null for no cap.' };
  const beds = body.bedrooms_needed ?? null;
  if (beds !== null && (!Number.isInteger(beds) || (beds as number) < 0 || (beds as number) > 20)) return { ok: false, error: 'bedrooms_needed must be a whole number from 0 to 20, or null.' };
  const about = text(body.about, 2000), looking = text(body.looking_for, 2000);
  if (about === undefined || looking === undefined) return { ok: false, error: 'about and looking_for must be text up to 2000 characters.' };
  const rules = body.join_rules ?? {};
  if (!isObj(rules) || Object.entries(rules).some(([k, v]) => !['budget', 'beds_movein', 'areas'].includes(k) || typeof v !== 'boolean')) return { ok: false, error: 'join_rules may only hold budget, beds_movein and areas, each true or false.' };
  const filters = body.filters ?? {};
  if (!isObj(filters)) return { ok: false, error: 'filters must be an object.' };
  const open = body.open_to_join ?? false;
  if (typeof open !== 'boolean') return { ok: false, error: 'open_to_join must be true or false.' };
  if (open && kind !== 'open') return { ok: false, error: 'only an open flock can be open_to_join.' };
  return { ok: true, value: { name, kind, about, looking_for: looking, open_to_join: open, join_rules: rules as CreateFlock['join_rules'], max_size: max as number | null, bedrooms_needed: beds as number | null, filters } };
}
