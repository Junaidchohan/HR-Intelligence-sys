"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";

const NAV_LINKS = [
  { href: "/",               label: "Home"           },
  { href: "/command-center", label: "Command Center" },
  { href: "/candidates",     label: "Candidates"     },
  { href: "/companies",      label: "Companies"      },
  { href: "/rubrics",        label: "Rubrics"        },
  { href: "/jobs",           label: "Jobs"           },
  { href: "/batch",          label: "Batch"          },
  { href: "/settings",       label: "Settings"       },
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
    `nav-link text-base ${pathname === path ? " active" : ""}`;

  return (
    <nav className="nav h-20 px-8" ref={menuRef} style={{ minHeight: "80px" }}>
      {/* ─── Brand ─────────────────────────────────────────────── */}
      <Link href={loggedIn ? "/candidates" : "/"} className="brand text-2xl font-bold" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "1.5rem" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent, #6366f1)", flexShrink: 0 }} aria-hidden="true">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M12 6l-4 8h8z" />
          <path d="M8 14h8" />
        </svg>
        <span>Talentbase AI</span>
      </Link>

      {/* ─── Desktop links (hidden on mobile) ──────────────────── */}
      <div className="nav-links-desktop">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass(href)} style={{ fontSize: "1rem" }}>
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
            style={{ fontSize: 13, padding: "8px 16px", margin: 0 }}
          >
            Log out
          </button>
        ) : (
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link href="/login" className={linkClass("/login")} style={{ fontSize: "1rem" }}>
              Log in
            </Link>
            <Link href="/signup" className={linkClass("/signup")} style={{ fontSize: "1rem" }}>
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
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          /* Hamburger icon */
          <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden="true">
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
              style={{ fontSize: "1rem" }}
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
                style={{ fontSize: "1rem" }}
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={linkClass("/signup")}
                style={{ fontSize: "1rem" }}
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
