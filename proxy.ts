import { NextResponse, type NextRequest } from 'next/server';

// Optimistic redirects only (docs/DESIGN.md §10): checks that a Supabase session cookie exists, no network call.
// Real checks happen where data is read: row-level security in the database and requireUser in Route Handlers.
const AUTH_PAGES = ['/welcome', '/signin', '/signup'];

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === '1') return NextResponse.next(); // demo: seeded people, no sign-in
  const path = request.nextUrl.pathname;
  const signedIn = request.cookies.getAll().some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
  const onAuthPage = AUTH_PAGES.includes(path);

  if (!signedIn && !onAuthPage) {
    const url = new URL('/welcome', request.url);
    if (path !== '/') url.searchParams.set('next', path + request.nextUrl.search); // e.g. an invite link
    return NextResponse.redirect(url);
  }
  if (signedIn && onAuthPage) return NextResponse.redirect(new URL('/flocks', request.url));
  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes (they use requireUser), Next internals and files with an extension.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
