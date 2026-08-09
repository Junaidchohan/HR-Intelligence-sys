"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/api";

const PUBLIC_PATHS = ["/login", "/signup"];

/**
 * AuthGuard — wraps the entire app layout.
 *
 * Strategy:
 *  - Render nothing (blank screen) until we know if the user is authenticated.
 *    This prevents unauthenticated flashes of protected content.
 *  - If unauthenticated and not on a public path → redirect to /login.
 *  - If authenticated and on a public path → redirect to /candidates.
 *
 * Why not Next.js middleware?
 *   The JWT is stored in localStorage which is inaccessible on the Edge runtime.
 *   Once you migrate to HttpOnly cookies, move this logic to middleware.ts.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!token && !isPublic) {
      router.replace("/login");
    } else if (token && isPublic) {
      router.replace("/candidates");
    } else {
      setChecking(false);
    }
  }, [pathname, router]);

  if (checking) {
    // Render an invisible placeholder to avoid layout shift while we decide.
    return null;
  }

  return <>{children}</>;
}
