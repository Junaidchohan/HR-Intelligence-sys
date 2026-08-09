"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GitFork, Cpu, Sparkles, Lock } from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

export default function SettingsPage() {
  const [ghToken, setGhToken] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [configured, setConfigured] = useState({
    github: false,
    anthropic: false,
    openai: false,
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSettings();
      setConfigured({
        github: res.github_token_configured,
        anthropic: res.anthropic_api_key_configured,
        openai: res.openai_api_key_configured,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load settings (must be logged in as Admin)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving settings...");
    setError(null);
    try {
      const payload: { github_token?: string; anthropic_api_key?: string; openai_api_key?: string } = {};
      if (ghToken.trim()) payload.github_token = ghToken;
      if (anthropicKey.trim()) payload.anthropic_api_key = anthropicKey;
      if (openaiKey.trim()) payload.openai_api_key = openaiKey;

      const res = await api.saveSettings(payload);
      setConfigured({
        github: res.github_token_configured,
        anthropic: res.anthropic_api_key_configured,
        openai: res.openai_api_key_configured,
      });
      setGhToken("");
      setAnthropicKey("");
      setOpenaiKey("");
      setStatus("Settings saved successfully.");
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      setStatus(null);
    }
  }

  if (loading) {
    return <PageSkeleton type="details" className="max-w-5xl mx-auto px-4 py-8" />;
  }

  return (
    <div className="fade-in max-w-5xl mx-auto px-4 py-8">
      {/* Header section with Save Button */}
      <form onSubmit={handleSave}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-8 border-b border-slate-700/60 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Integration Console</h1>
            <p className="text-slate-400 text-sm">
              Manage your API keys to power the Talent Graph and AI Screening engine. Keys are encrypted at rest.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 px-5 rounded-lg shadow-lg shadow-purple-500/20 transition-all duration-200 disabled:opacity-50 text-sm"
          >
            Save Credentials
          </button>
        </div>

        <div className="flex flex-col gap-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}
            {status && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm">
                {status}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GitHub Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <GitFork className="w-5 h-5 text-slate-300" />
                      <h3 className="text-lg font-semibold text-white">GitHub</h3>
                    </div>
                    {configured.github ? (
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Connected</span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">Not Configured</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-6">
                    Required for resolving candidate identities and fetching detailed GitHub profiles and contributions.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder={configured.github ? "••••••••••••••••••••••••" : "ghp_..."}
                    className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Anthropic Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-slate-300" />
                      <h3 className="text-lg font-semibold text-white">Anthropic</h3>
                    </div>
                    {configured.anthropic ? (
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Connected</span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">Not Configured</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-6">
                    Power the AI agent screening process with Claude. Used for analyzing candidate source code and repositories.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder={configured.anthropic ? "••••••••••••••••••••••••" : "sk-ant-..."}
                    className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* OpenAI Card */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 flex flex-col justify-between md:col-span-2">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-slate-300" />
                      <h3 className="text-lg font-semibold text-white">OpenAI</h3>
                    </div>
                    {configured.openai ? (
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Connected</span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">Not Configured</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-6">
                    Used as alternative models for candidate summary generation, job description tuning, and general data normalization.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder={configured.openai ? "••••••••••••••••••••••••" : "sk-..."}
                    className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  />
                </div>
              </div>

            </div>
          </div>
      </form>
    </div>
  );
}
