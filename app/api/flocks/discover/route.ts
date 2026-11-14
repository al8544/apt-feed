import { requireUser } from '@/lib/server/auth';
import { discover } from '@/lib/server/discover';

// GET /api/flocks/discover[?id=<flock id>]: open flocks ranked by compatibility with the caller (Figma 00i, 00j).
export async function GET(request: Request) {
  const caller = await requireUser(request);
  if (caller instanceof Response) return caller;

  const result = await discover(caller.user.id, new URL(request.url).searchParams.get('id'));
  return 'error' in result ? Response.json({ error: result.error }, { status: result.status }) : Response.json(result);
}
