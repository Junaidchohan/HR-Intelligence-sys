import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path "/" is completely public
  if (pathname === "/") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Match every page route except login, signup, next static assets, and favicon
  matcher: ["/((?!login|signup|_next/static|_next/image|favicon.ico|api).*)"],
};
