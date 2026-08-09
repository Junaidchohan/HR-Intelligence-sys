import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — runs on the Edge runtime before every request.
 *
 * Auth state lives in localStorage (client-only), so we cannot read the JWT
 * here. What we CAN do reliably at the edge:
 *   • Redirect the root "/" so the server never serves a blank flash.
 *   • The token-based guard is delegated to AuthGuard (client component in
 *     layout.tsx), which runs immediately on hydration with no visible flash
 *     because we set a loading state.
 *
 * If you later move to HttpOnly cookies for auth, replace this middleware to
 * inspect `request.cookies.get("token")` and do all redirects here.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect bare "/" to the app shell; AuthGuard will decide /login vs /candidates.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/candidates", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match every page route but skip Next.js internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
