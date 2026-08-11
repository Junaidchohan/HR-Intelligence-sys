"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.access_token);
      router.push("/candidates");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-transparent text-white font-sans">
      {/* ─── Full-screen Edge-to-Edge Space Background ─── */}
      <div className="fixed inset-0 w-screen h-screen z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center animate-[slowZoom_30s_ease-in-out_infinite] object-cover"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-slate-900/10" />
      </div>

      {/* ─── Form Container (Transparent Outer Wrapper) ─── */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-140px)] py-12 px-4 bg-transparent">
        <div className="card fade-in relative z-10 w-full" style={{ maxWidth: 420, padding: "40px", backdropFilter: "blur(16px)" }}>
          <h2 style={{ textAlign: "center", marginBottom: 6, fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em" }}>Sign in</h2>
          <p className="muted" style={{ textAlign: "center", marginBottom: 32, fontSize: 13 }}>
            Access the Talentbase AI Command Console
          </p>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600 }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: "12px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600 }}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: "12px" }}
              />
            </div>
            <PrimaryButton type="submit" disabled={loading} className="w-full py-3.5 mt-2 text-sm uppercase tracking-wider">
              {loading ? "Authenticating..." : "Sign In"}
            </PrimaryButton>
            {error && <p style={{ color: "var(--bad)", fontSize: 13, textAlign: "center", marginTop: 4 }}>{error}</p>}
          </form>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border)", fontSize: 13, textAlign: "center" }}>
            <span className="muted">Don't have an account? </span>
            <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
