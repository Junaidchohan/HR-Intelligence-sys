"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

const NAV_LINKS = [
  { href: "/candidates", label: "Candidates" },
  { href: "/companies",  label: "Companies"  },
  { href: "/rubrics",    label: "Rubrics"    },
  { href: "/jobs",       label: "Jobs"        },
  { href: "/batch",      label: "Batch"       },
  { href: "/settings",   label: "Settings"    },
];

export default function Nav() {
  const router   = useRouter();
  const pathname = usePathname();

  const [loggedIn,     setLoggedIn]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Re-evaluate auth state on every route change.
  useEffect(() => {
    setLoggedIn(!!getToken());
    setMenuOpen(false); // close menu on navigation
  }, [pathname]);

  // Close the mobile menu when clicking outside.
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  function logout() {
    clearToken();
    setLoggedIn(false);
    router.push("/login");
  }

  const linkClass = (path: string) =>
    `nav-link${pathname === path ? " active" : ""}`;

  return (
    <nav className="nav" ref={menuRef}>
      {/* ─── Brand ─────────────────────────────────────────────── */}
      <Link href="/candidates" className="brand" style={{ textDecoration: "none" }}>
        Talent Intelligence
      </Link>

      {/* ─── Desktop links (hidden on mobile) ──────────────────── */}
      <div className="nav-links-desktop">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            {label}
          </Link>
        ))}
      </div>

      {/* ─── Desktop auth action ────────────────────────────────── */}
      <div className="nav-auth-desktop">
        {loggedIn ? (
          <button
            className="secondary"
            onClick={logout}
            style={{ fontSize: 12, padding: "6px 12px", margin: 0 }}
          >
            Log out
          </button>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="/login" className={linkClass("/login")}>
              Log in
            </Link>
            <Link href="/signup" className={linkClass("/signup")}>
              Sign up
            </Link>
          </div>
        )}
      </div>

      {/* ─── Hamburger button (visible on mobile only) ──────────── */}
      <button
        className="hamburger"
        aria-label="Toggle navigation menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? (
          /* X icon */
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          /* Hamburger icon */
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <line x1="3" y1="6"  x2="19" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* ─── Mobile dropdown menu ────────────────────────────────── */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(href)}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="mobile-menu-divider" />
          {loggedIn ? (
            <button
              className="secondary mobile-menu-btn"
              onClick={() => { setMenuOpen(false); logout(); }}
            >
              Log out
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href="/login"
                className={linkClass("/login")}
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={linkClass("/signup")}
                onClick={() => setMenuOpen(false)}
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
