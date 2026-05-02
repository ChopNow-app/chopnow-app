import { NextResponse, type NextRequest } from 'next/server';

// Sprint 1: route guards stay permissive while we build auth flow.
// Each protected segment will tighten its own guard once Story 1.1/1.6 lands.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/livreur/:path*', '/vendor/:path*', '/admin/:path*'],
};
