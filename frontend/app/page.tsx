"use client";

import Link from "next/link";
import { Network, CheckCircle2, Layers, ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-transparent text-white font-sans flex flex-col justify-between">
      {/* ─── Background Image with Ultra-Slow Cinematic Zoom ─── */}
      <div className="fixed inset-0 w-screen h-screen z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center animate-[slowZoom_30s_ease-in-out_infinite] object-cover"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')`,
          }}
        />
        {/* Soft Lighter Overlay bg-black/10 for maximum Earth clarity */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* ─── Content Wrapper ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        {/* ─── Main Hero & Features Container ──────────────────────────────── */}
        <main className="flex-1 w-full px-6 pt-20 pb-24 flex flex-col justify-center">
          {/* Hero Section (95% Transparent Card) */}
          <div className="text-center max-w-4xl mx-auto space-y-6 p-8 rounded-3xl bg-slate-900/5 backdrop-blur-md border border-white/10 shadow-xl">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight animate-[fadeInUp_0.8s_ease-out]">
              Unified Lead Command & <br />
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
                Autonomous Talent Intelligence
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-normal leading-relaxed animate-[fadeInUp_0.8s_ease-out] delay-100">
              Transform high-demand technical hiring with continuous AI entity resolution, verifiable candidate evidence ledgers, and automated demand-supply matching.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-[fadeInUp_0.8s_ease-out] delay-200">
              <Link
                href="/candidates"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]"
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

          {/* Features Section (3 Pillars - 95% Transparent Cards) */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto w-full">
            {/* Pillar 1 */}
            <div className="bg-slate-900/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-purple-500/40 transition-all duration-300 animate-[fadeInUp_0.8s_ease-out] delay-100 shadow-xl group">
              <Network className="w-8 h-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Talent Graph</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Pulls from GitHub, arXiv, and HuggingFace; resolves messy identities into one unified profile you own.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-900/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-indigo-500/40 transition-all duration-300 animate-[fadeInUp_0.8s_ease-out] delay-200 shadow-xl group">
              <CheckCircle2 className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Auditable Screening</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Scores candidates against custom rubrics with verifiable citations and an immutable evidence ledger.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-900/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:border-blue-500/40 transition-all duration-300 animate-[fadeInUp_0.8s_ease-out] delay-300 shadow-xl group">
              <Layers className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-2">Command Center</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Matches urgent demand-side opportunities with existing supply-side candidate inventory automatically.
              </p>
            </div>
          </div>
        </main>

        {/* Footer rendered directly at the bottom */}
        <Footer />
      </div>
    </div>
  );
}
