"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/api";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!token && !isPublic) {
      router.replace("/login");
    } else if (token && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/candidates");
    } else {
      setChecking(false);
    }
  }, [pathname, router]);

  if (checking) {
    return null;
  }

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  if (isPublicPage) {
    return <main className="w-full min-h-screen bg-transparent">{children}</main>;
  }

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-transparent fade-in">
      {children}
    </main>
  );
}
