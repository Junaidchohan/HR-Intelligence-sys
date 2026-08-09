"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api, Rubric } from "@/lib/api";
import { ChevronDown } from "lucide-react";
import { PageSkeleton, ShimmerBlock } from "@/components/ui/PageSkeleton";

interface BatchResult {
  username: string;
  name: string;
  score: number;
  status: "pending" | "processing" | "complete" | "failed";
  avatar: string;
  error?: string;
}

export default function BatchScreeningPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<number | null>(null);
  const [rawUsernames, setRawUsernames] = useState("");
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<string | null>(null);
  const resultsRef = useRef<BatchResult[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await api.listRubrics();
        setRubrics(list);
        if (list.length) setSelectedRubric(list[0].id);
      } catch (err: any) {
        setGlobalStatus(`Failed to load rubrics: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function runBatch() {
    if (!selectedRubric) {
      setGlobalStatus("Please select an evaluation rubric first.");
      return;
    }
    const usernamesList = rawUsernames
      .split(/[\s,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (usernamesList.length === 0) {
      setGlobalStatus("Please enter at least one GitHub username.");
      return;
    }

    setRunning(true);
    setGlobalStatus("Initializing batch process...");
    
    // Initialize results
    const initialResults: BatchResult[] = usernamesList.map((u) => ({
      username: u,
      name: u,
      score: 0,
      status: "pending",
      avatar: `https://github.com/${u}.png`,
    }));
    setResults(initialResults);
    resultsRef.current = initialResults;

    try {
      await api.runBatchScreening(selectedRubric, usernamesList, (event: any) => {
        const username = event.username;
        const status = event.status; // 'processing', 'complete', 'failed'
        
        let updatedList = resultsRef.current.map(r => {
          if (r.username === username) {
            return {
              ...r,
              status,
              score: event.score || r.score,
              name: event.name || r.name,
              avatar: event.avatar || r.avatar,
              error: event.error,
            };
          }
          return r;
        });

        // Sort Highest Score to Lowest Score (only if complete, otherwise keep pending at bottom or something)
        // Let's sort simply by score descending.
        updatedList.sort((a, b) => b.score - a.score);

        resultsRef.current = updatedList;
        setResults([...updatedList]);
      });
      setGlobalStatus("Batch processing completed!");
    } catch (err: any) {
      setGlobalStatus(`Batch failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  function getScoreColor(score: number) {
    if (score >= 0.8) return "text-emerald-500 border-emerald-500";
    if (score >= 0.5) return "text-amber-500 border-amber-500";
    return "text-red-500 border-red-500";
  }

  if (loading) {
    return <PageSkeleton type="grid" />;
  }

  return (
    <div className="fade-in">
      <h1 className="text-3xl font-bold text-white mb-8">Batch Screening</h1>

      {/* Top Form Section */}
      <div className="card w-full bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
        <h3 className="text-xl font-semibold text-white mb-6">Configure Batch</h3>
        
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Evaluation Rubric</label>
            <div className="relative">
              <select
                value={selectedRubric || ""}
                onChange={(e) => setSelectedRubric(Number(e.target.value))}
                disabled={running}
                className="w-full bg-slate-900 border border-slate-700 text-white p-3 pr-10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                {rubrics.length === 0 && <option value="">No rubrics available</option>}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">GitHub Usernames (comma or space separated)</label>
          <textarea
            value={rawUsernames}
            onChange={(e) => setRawUsernames(e.target.value)}
            disabled={running}
            placeholder="torvalds, karpathy, junaidchohan"
            className="w-full h-16 resize-none bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-700/50">
          <div className="text-sm text-gray-400">
            {globalStatus && <span className={globalStatus.includes('failed') ? 'text-red-400' : 'text-indigo-400'}>{globalStatus}</span>}
          </div>
          <button
            onClick={runBatch}
            disabled={running || !selectedRubric || !rawUsernames.trim()}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Processing Batch..." : "Run Batch Screening"}
          </button>
        </div>
      </div>

      {/* Bottom Leaderboard Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-white mb-6">Batch Progress / Results</h3>
        
        <div className="card w-full bg-slate-800/50 border border-slate-700 p-0 rounded-xl overflow-hidden">
          <div className="overflow-y-auto max-h-[400px] p-6 flex flex-col gap-4">
            {results.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No results yet. Start a batch screening!</div>
            ) : (
              results.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:bg-slate-900 transition-colors duration-200">
                  <div className="flex items-center gap-4">
                    <img src={r.avatar} alt={r.username} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                    <div>
                      <a
                        href={`https://github.com/${r.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-lg font-bold text-white hover:text-indigo-400 transition-colors duration-200"
                      >
                        {r.name} <span className="text-xs text-gray-400">↗</span>
                      </a>
                      <span className="text-xs text-gray-500 block">@{r.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Status Badge */}
                    <div className="flex items-center justify-center min-w-[100px]">
                      {r.status === 'complete' && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">Complete</span>}
                      {r.status === 'processing' && (
                        <span className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
                          <ShimmerBlock className="w-3 h-3 rounded-full" />
                          Processing
                        </span>
                      )}
                      {r.status === 'pending' && <span className="px-3 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-xs font-semibold">Pending</span>}
                      {r.status === 'failed' && <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold" title={r.error}>Failed</span>}
                    </div>

                    {/* Circular Score */}
                    <div className="flex items-center justify-center w-16 h-16 relative">
                      {(() => {
                        try {
                          const rawScore = r.score;
                          if (typeof rawScore !== "number" || isNaN(rawScore)) throw new Error("Invalid score");
                          // Normalize if raw score exceeds 100 (e.g., raw sum from backend)
                          const normalized = rawScore > 100 ? Math.round(rawScore / 30) : Math.round(rawScore);
                          const displayScore = normalized > 100 ? 100 : normalized; // cap at 100
                          const dashOffset = 100 - displayScore;
                          return (
                            <>
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-800" strokeWidth="3"></circle>
                                <circle cx="18" cy="18" r="16" fill="none" className={`transition-all duration-1000 ${getScoreColor(displayScore / 100).split(' ')[0]}`} strokeWidth="3" strokeDasharray="100" strokeDashoffset={dashOffset} strokeLinecap="round"></circle>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">{displayScore}%</span>
                              </div>
                            </>
                          );
                        } catch {
                          return <span className="text-sm font-bold text-white">N/A</span>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
