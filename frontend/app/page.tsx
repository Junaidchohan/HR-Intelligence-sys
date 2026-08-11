"use client";

import Link from "next/link";
import { Network, CheckCircle2, Layers, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white font-sans">
      {/* ─── 1. Background Image with Ultra-Slow Cinematic Zoom Animation ─── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')`,
          }}
        />
        {/* ─── 2. Heavy Glassmorphism Dark Overlay ─────────────────────────── */}
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
      </div>

      {/* ─── Content Wrapper ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ─── 3. Navbar ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/10 px-6 py-4 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white no-underline">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-400"
                aria-hidden="true"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 6l-4 8h8z" />
                <path d="M8 14h8" />
              </svg>
              <span>Talentbase AI</span>
            </Link>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 rounded-xl backdrop-blur-sm transition-all shadow-md"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Main Hero & Features Container ──────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto px-6 pt-20 pb-24 flex flex-col justify-center">
          {/* ─── 4. Hero Section ────────────────────────────────────────────── */}
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight animate-fade-in-up">
              Unified Lead Command & <br />
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
                Autonomous Talent Intelligence
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed animate-fade-in-up delay-100">
              Transform high-demand technical hiring with continuous AI entity resolution, verifiable candidate evidence ledgers, and automated demand-supply matching.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up delay-200">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <span>Start Screening</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md text-white font-semibold text-base px-8 py-4 rounded-xl transition-all"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* ─── 5. Features Section (3 Pillars) ─────────────────────────────── */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
            {/* Pillar 1 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-purple-500/40 transition-all duration-300 animate-fade-in-up delay-100 shadow-xl group">
              <Network className="w-8 h-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Talent Graph</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Pulls from GitHub, arXiv, and HuggingFace; resolves messy identities into one unified profile you own.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-indigo-500/40 transition-all duration-300 animate-fade-in-up delay-200 shadow-xl group">
              <CheckCircle2 className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Auditable Screening</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Scores candidates against custom rubrics with verifiable citations and an immutable evidence ledger.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-blue-500/40 transition-all duration-300 animate-fade-in-up delay-300 shadow-xl group">
              <Layers className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Command Center</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Matches urgent demand-side opportunities with existing supply-side candidate inventory automatically.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
