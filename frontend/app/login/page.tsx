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
    <div className="card fade-in" style={{ maxWidth: 420, margin: "80px auto", padding: "40px" }}>
      <h2 style={{ textAlign: "center", marginBottom: 6, fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em" }}>Sign in</h2>
      <p className="muted" style={{ textAlign: "center", marginBottom: 32, fontSize: 13 }}>
        Access the AI Talent Command Console
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
  );
}

