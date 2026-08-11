"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  UserPlus, 
  X, 
  Eye, 
  Trash2, 
  MapPin, 
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import { api, Candidate } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";
import { PageSkeleton, ShimmerBlock } from "@/components/ui/PageSkeleton";

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "UN";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function MiniScoreRing({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-zinc-500">—</span>
        </div>
        <span className="text-sm font-medium text-zinc-400">Not Matched</span>
      </div>
    );
  }

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - score / 100);

  let ringColor = "#ef4444";
  if (score > 75) ringColor = "#10b981";
  else if (score >= 50) ringColor = "#f59e0b";

  return (
    <div className="flex items-center gap-3" title={`Latest Screening Score: ${score}/100`}>
      <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
          <circle
            cx="30"
            cy="30"
            r={radius}
            className="stroke-zinc-800/80"
            strokeWidth="4.5"
            fill="transparent"
          />
          <circle
            cx="30"
            cy="30"
            r={radius}
            stroke={ringColor}
            strokeWidth="4.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-lg font-bold text-white">
          {Math.round(score)}
        </span>
      </div>
      <span className="text-sm font-medium text-zinc-400">
        {score > 75 ? "Top Match" : score >= 50 ? "Good Match" : "Low Match"}
      </span>
    </div>
  );
}

function CandidateAvatar({ candidate }: { candidate: Candidate }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(candidate.full_name);

  // Extract GitHub username from email or full_name
  let username = "";
  if (candidate.primary_email && candidate.primary_email.includes("@")) {
    username = candidate.primary_email.split("@")[0];
  } else if (candidate.full_name) {
    const trimmed = candidate.full_name.trim();
    if (!trimmed.includes(" ")) {
      username = trimmed;
    }
  }

  const avatarUrl = username ? `https://avatars.githubusercontent.com/${username}` : null;

  if (!avatarUrl || imgError) {
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-sm text-white shadow-md shadow-purple-500/10 flex-shrink-0 border border-white/10">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={candidate.full_name || "Avatar"}
      onError={() => setImgError(true)}
      className="w-12 h-12 rounded-full object-cover border border-white/10 shadow-md shadow-purple-500/10 flex-shrink-0"
    />
  );
}

export default function CandidatesDirectoryPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [inputVal, setInputVal] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  // GitHub Preview State
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [previewError, setPreviewError] = useState("");
  const [githubPreview, setGithubPreview] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"name" | "score" | "date">("date");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listCandidates();
      setCandidates(data || []);
      
      // Fetch scores in background
      if (data && data.length > 0) {
        const scoreMap: Record<number, number | null> = {};
        await Promise.all(
          data.map(async (c) => {
            try {
              const runs = await api.screeningsForCandidate(c.id);
              scoreMap[c.id] = runs && runs.length > 0 ? runs[0].overall_score : null;
            } catch {
              scoreMap[c.id] = null;
            }
          })
        );
        setScores(scoreMap);
      }
    } catch (err: any) {
      setStatus(err.message || "Failed to fetch candidate directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Close active row menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSearchGithub() {
    if (!inputVal.trim()) return;
    setPreviewStatus("loading");
    setPreviewError("");
    setGithubPreview(null);
    setStatus(null);

    try {
      // Call the backend endpoint to fetch live GitHub user data
      const res = await api.searchGithubUser(inputVal.trim());
      setGithubPreview(res);
      setPreviewStatus("success");
    } catch (err: any) {
      console.error(err);
      // UX Polish text as requested:
      setPreviewError("User not found on GitHub");
      setPreviewStatus("error");
    }
  }

  async function handleIngest() {
    const targetUsername = githubPreview?.login || inputVal.trim();
    if (!targetUsername) {
      setStatus("Please enter a valid GitHub username to ingest.");
      return;
    }
    setIngesting(true);
    setStatus("Adding to database...");
    try {
      const res = await api.ingestCandidate("github", targetUsername);
      setStatus(`${res.is_new ? "Ingested new" : "Merged into existing"} candidate dossier #${res.candidate_id} (${res.resolution_reason}).`);
      // Reset search
      setInputVal("");
      setPreviewStatus("idle");
      setGithubPreview(null);
      await load();
    } catch (err: any) {
      const msg = err.message || "Failed to add candidate.";
      setStatus(msg);
    } finally {
      setIngesting(false);
    }
  }

  async function handleDelete(id: number, name: string | null) {
    setActiveMenuId(null);
    if (!window.confirm(`Are you sure you want to permanently remove ${name || 'candidate'}?`)) {
      return;
    }
    try {
      await api.deleteCandidate(id);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setStatus(`Successfully removed candidate record.`);
    } catch (err: any) {
      setStatus(`Failed to remove candidate: ${err.message}`);
    }
  }

  // Filtered and Sorted Candidates for Data Grid
  const processedCandidates = useMemo(() => {
    let result = [...candidates];

    // Filter if search input is active
    if (inputVal.trim()) {
      const q = inputVal.toLowerCase().trim();
      result = result.filter((c) => {
        const nameMatch = (c.full_name || "").toLowerCase().includes(q);
        const emailMatch = (c.primary_email || "").toLowerCase().includes(q);
        const skillMatch = (c.skills || []).some((s) => s.toLowerCase().includes(q));
        const locMatch = (c.location || "").toLowerCase().includes(q);
        return nameMatch || emailMatch || skillMatch || locMatch;
      });
    }

    // Sort candidates
    result.sort((a, b) => {
      if (sortBy === "name") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      } else if (sortBy === "score") {
        const scoreA = scores[a.id] ?? -1;
        const scoreB = scores[b.id] ?? -1;
        return scoreB - scoreA;
      } else {
        // Date added (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [candidates, inputVal, sortBy, scores]);

  if (loading) {
    return <PageSkeleton type="list" className="max-w-7xl mx-auto px-2 py-4" />;
  }

  return (
    <div className="fade-in space-y-8 max-w-7xl mx-auto px-2 py-4">
      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Command Center
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time entity resolution, skill verification, and multi-source talent intelligence.
          </p>
        </div>
      </div>

      {/* 1. Unified Command Bar with Autocomplete */}
      <div className="relative bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-2xl rounded-2xl p-2.5 shadow-2xl transition-all duration-300 hover:border-zinc-700/80">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          {/* Left Label */}
          <div className="flex items-center gap-2 px-3 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">
            <Search className="w-5 h-5 text-gray-400" />
            <span>Search & Ingest</span>
          </div>

          {/* Middle Glassmorphism Input Container */}
          <div className="relative flex-1 w-full" ref={searchContainerRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none z-10" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchGithub();
                }
              }}
              placeholder="Enter GitHub username (e.g., junaidchohan) and hit Enter..."
              className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            />
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <PrimaryButton
              onClick={handleSearchGithub}
              disabled={previewStatus === "loading" || !inputVal.trim()}
              className="text-xs uppercase tracking-wider"
            >
              {previewStatus === "loading" ? (
                <ShimmerBlock className="w-4 h-4 rounded-full" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {previewStatus === "loading" ? "Searching..." : "Search"}
            </PrimaryButton>

            {inputVal && (
              <button
                onClick={() => {
                  setInputVal("");
                  setPreviewStatus("idle");
                  setGithubPreview(null);
                  load();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-zinc-400 hover:text-white bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Preview Card for GitHub Profile */}
        {previewStatus === "loading" && (
          <div className="mt-4 p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center justify-center">
            <ShimmerBlock className="w-5 h-5 rounded-full mr-3" />
            <span className="text-zinc-400 font-medium tracking-wide">Searching GitHub...</span>
          </div>
        )}

        {previewStatus === "error" && (
          <div className="mt-4 p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-center">
            <p className="text-zinc-500 font-semibold text-lg">{previewError}</p>
          </div>
        )}

        {previewStatus === "success" && githubPreview && (
          <div className="mt-4 p-6 bg-zinc-950/80 backdrop-blur-2xl border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden group transition-all duration-300">
            {/* Glassmorphism gradient effect */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700"></div>

            <img 
              src={githubPreview.avatar_url || `https://avatars.githubusercontent.com/${githubPreview.login}`} 
              alt={githubPreview.name || githubPreview.login} 
              className="w-24 h-24 rounded-full border border-white/10 shadow-xl object-cover relative z-10"
            />
            <div className="flex-1 text-center md:text-left relative z-10">
              <h3 className="text-2xl font-extrabold text-white tracking-tight">{githubPreview.name || githubPreview.login}</h3>
              <p className="text-sm text-blue-400 font-semibold mt-0.5">@{githubPreview.login}</p>
              
              {githubPreview.bio && (
                <p className="text-zinc-300 mt-3 text-sm leading-relaxed max-w-2xl">
                  {githubPreview.bio}
                </p>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                 {githubPreview.location && (
                   <span className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-300 font-medium">
                     <MapPin className="w-3 h-3 text-zinc-500" /> {githubPreview.location}
                   </span>
                 )}
                 <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-300 font-medium">
                   {githubPreview.public_repos || 0} Repos
                 </span>
                 <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-300 font-medium">
                   {githubPreview.followers || 0} Followers
                 </span>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex-shrink-0 relative z-10 md:self-center">
              <PrimaryButton 
                onClick={handleIngest} 
                disabled={ingesting}
                className="py-3 px-6 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-zinc-200 border-none shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                {ingesting ? (
                  <ShimmerBlock className="w-4 h-4 rounded-full mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {ingesting ? "Adding..." : "Add to Database"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {status && (
          <div className={`mt-3 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
            status.toLowerCase().includes("not found") || status.toLowerCase().includes("failed") || status.toLowerCase().includes("error") || status.toLowerCase().includes("404")
              ? "bg-rose-950/50 border border-rose-800/50 text-rose-300 shadow-md shadow-rose-950/30"
              : "bg-blue-950/40 border border-blue-800/40 text-blue-300"
          }`}>
            {status.toLowerCase().includes("not found") || status.toLowerCase().includes("failed") || status.toLowerCase().includes("error") || status.toLowerCase().includes("404") ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
            <span>{status}</span>
          </div>
        )}
      </div>

      {/* 4. Dynamic Table Control Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Sort by:</span>
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900/80 border border-zinc-800/80 text-white text-xs rounded-xl px-3.5 py-1.5 pr-8 appearance-none focus:outline-none focus:border-zinc-700 font-medium cursor-pointer"
            >
              <option value="date">Date Added (Newest)</option>
              <option value="name">Candidate Name (A-Z)</option>
              <option value="score">Screening Score (High to Low)</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900/50 border border-zinc-800/60 px-3.5 py-1.5 rounded-xl">
          Total Candidates: <span className="text-white font-extrabold ml-1">{processedCandidates.length}</span>
        </div>
      </div>

      {/* 2. Interactive Data Grid */}
      <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
        {/* Table Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-900/40 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
          <div className="col-span-4 md:col-span-3">Candidate</div>
          <div className="col-span-3 md:col-span-2">Quick AI Score</div>
          <div className="col-span-3 md:col-span-4">Verified Skills</div>
          <div className="hidden md:block md:col-span-2">Location</div>
          <div className="col-span-2 md:col-span-1 text-right">Actions</div>
        </div>

        {processedCandidates.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            No candidates matched your search criteria.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {processedCandidates.map((c) => {
              const initials = getInitials(c.full_name);
              const candidateScore = scores[c.id] ?? null;

              return (
                <div
                  key={c.id}
                  className="grid grid-cols-12 gap-4 items-center px-6 py-4 transition-all duration-300 hover:bg-white/[0.03] hover:-translate-y-0.5 group"
                >
                  {/* Candidate Avatar & Name */}
                  <div className="col-span-4 md:col-span-3 flex items-center gap-3.5">
                    <CandidateAvatar candidate={c} />
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate"
                      >
                        {c.full_name || "Unknown Candidate"}
                      </Link>
                      <span className="text-xs text-gray-400 truncate">
                        Source: GitHub
                      </span>
                    </div>
                  </div>

                  {/* Quick AI Score Column */}
                  <div className="col-span-3 md:col-span-2">
                    <MiniScoreRing score={candidateScore} />
                  </div>

                  {/* Skills Column */}
                  <div className="col-span-3 md:col-span-4 flex flex-wrap gap-1.5 items-center">
                    {(c.skills || []).slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-sm bg-white/10 text-zinc-200 px-3 py-1 rounded-full lowercase"
                      >
                        {s}
                      </span>
                    ))}
                    {(c.skills || []).length > 4 && (
                      <span className="text-xs font-semibold text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1 rounded-full">
                        +{(c.skills || []).length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Location Column */}
                  <div className="hidden md:flex md:col-span-2 items-center gap-1.5 text-sm text-gray-400">
                    <MapPin className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="truncate">{c.location || "Remote"}</span>
                  </div>

                  {/* Actions Column: View Profile Eye Icon + Trash2 */}
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1.5">
                    <Link
                      href={`/candidates/${c.id}`}
                      aria-label="View Profile"
                      title="View Profile"
                      className="bg-transparent text-white hover:bg-cyan-500/20 hover:text-cyan-400 hover:scale-110 rounded-full p-2.5 transition-all duration-200"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(c.id, c.full_name)}
                      aria-label="Remove Candidate"
                      title="Remove Candidate"
                      className="bg-transparent text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-full p-2.5 transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

