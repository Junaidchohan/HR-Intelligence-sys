"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(email, password);
      setToken(res.access_token);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
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
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* ─── Form Container (Dead Center Locked in Place) ─── */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 bg-transparent">
        <div
          className="relative z-10 w-full max-w-[420px] p-10 rounded-2xl bg-transparent border border-white/10 shadow-xl backdrop-blur-xl"
          style={{ backgroundColor: "transparent" }}
        >
          <h2 style={{ textAlign: "center", marginBottom: 6, fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em" }}>
            Create Account
          </h2>
          <p className="muted" style={{ textAlign: "center", marginBottom: 32, fontSize: 13 }}>
            Sign up for Talentbase AI
          </p>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600 }}>
                Email Address
              </label>
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
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600 }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: "12px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 600 }}>
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ padding: "12px" }}
              />
            </div>

            <PrimaryButton type="submit" disabled={loading} className="w-full py-3.5 mt-2 text-sm uppercase tracking-wider">
              {loading ? "Creating Account..." : "Sign Up"}
            </PrimaryButton>

            {error && <p style={{ color: "var(--bad)", fontSize: 13, textAlign: "center", marginTop: 4 }}>{error}</p>}
          </form>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border)", fontSize: 13, textAlign: "center" }}>
            <span className="muted">Already have an account? </span>
            <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
