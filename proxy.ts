import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge route guard for the three actor-protected segments:
 *   /vendor/*    (vendor self-service surfaces)
 *   /livreur/*   (rider courses + earnings)
 *   /admin/*     (validation queues + finance)
 *
 * Before Phase B1 this file was a no-op while auth was still in flight.
 * Without the guard, an anonymous user could navigate to /admin/dashboard,
 * see the layout chrome render, then hit a sea of 401s — broken UX even
 * though the backend correctly rejected every request.
 *
 * The check is intentionally cheap: presence of the HttpOnly `chopnow_rt`
 * refresh cookie. Edge runtime can't introspect the JWT cleanly (no
 * `jose` dep in this bundle), AND token *validity* is verified by the
 * backend on every API call anyway — middleware is a UX layer here,
 * not a security boundary. The security boundary is the API's global
 * JWT guard + @Roles decorator.
 *
 * Renamed from middleware.ts to proxy.ts per the Next 16 file convention
 * (silences the deprecation warning at build time).
 */

const REFRESH_COOKIE = 'chopnow_rt';

// Routes inside the protected matcher that are themselves the login UI.
// They MUST NOT redirect (else we loop) and they MUST be reachable while
// anonymous — that's the whole point of a login page.
const PUBLIC_WITHIN_MATCHER = new Set(['/admin/login']);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login pages within /admin/* stay open. /livreur and /vendor don't
  // have dedicated login pages — they share /login with the consumer
  // surface, which lives outside the matcher.
  if (PUBLIC_WITHIN_MATCHER.has(pathname)) return NextResponse.next();

  const hasRefresh = req.cookies.has(REFRESH_COOKIE);
  if (hasRefresh) return NextResponse.next();

  // Anonymous → bounce to login. Admin segment routes to /admin/login
  // (different account model). Vendor + livreur share the consumer
  // /login flow with role-aware post-login redirect.
  const isAdmin = pathname.startsWith('/admin');
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = isAdmin ? '/admin/login' : '/login';
  loginUrl.search = '';

  if (isAdmin) {
    // Admin login uses no `next` param — admins always land on /admin
    // after a successful login (single dashboard).
    return NextResponse.redirect(loginUrl);
  }

  // For consumer-side roles, preserve the requested path as `?next=...`
  // so we can ship them where they wanted to go after login. Sanitize
  // strictly: relative path only, no protocol, no host, no `//` prefix
  // (open-redirect prevention).
  const requested = pathname + (req.nextUrl.search ?? '');
  const safeNext = isSafeInternalPath(requested) ? requested : null;
  if (safeNext) loginUrl.searchParams.set('next', safeNext);

  return NextResponse.redirect(loginUrl);
}

function isSafeInternalPath(p: string): boolean {
  // Must be a path on our own origin: single leading slash, then a
  // non-slash char. `//evil.com` would parse as a protocol-relative URL
  // that browsers redirect cross-origin → classic open-redirect bug.
  return p.startsWith('/') && !p.startsWith('//') && !p.includes('://');
}

export const config = {
  matcher: ['/livreur/:path*', '/vendor/:path*', '/admin/:path*'],
};
