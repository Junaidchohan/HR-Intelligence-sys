"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { GitBranch, BookOpen, Layers, ArrowLeft } from "lucide-react";
import { api, CandidateDetail, JobReq, Screening, Rubric } from "@/lib/api";
import ScreeningDossier from "@/components/ScreeningDossier";
import PrimaryButton from "@/components/PrimaryButton";

// Dynamically import Tree to prevent SSR issues in Next.js
const Tree = dynamic(() => import("react-d3-tree"), { ssr: false });

function scoreClass(score: number) {
  if (score > 75) return "score-strong";
  if (score >= 50) return "score-possible";
  return "score-weak";
}

function scoreBadgeLabel(score: number) {
  if (score > 75) return "Top Talent";
  if (score >= 50) return "Good Match";
  return "Weak Match";
}

// Inner helper component to manage animated count-up and stroke-dashoffset transition
function AnimatedConfidenceRing({ targetScore, ringColor }: { targetScore: number; ringColor: string }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const [currentScore, setCurrentScore] = useState(0);
  const [strokeOffset, setStrokeOffset] = useState(circumference);

  useEffect(() => {
    setCurrentScore(0);
    setStrokeOffset(circumference);

    const animationTimeout = setTimeout(() => {
      const targetOffset = circumference * (1 - targetScore / 100);
      setStrokeOffset(targetOffset);
    }, 50);

    let start = 0;
    const duration = 1800; // 1.8 seconds
    const startTime = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(start + easeOut * (targetScore - start));
      setCurrentScore(val);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      clearTimeout(animationTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetScore, circumference]);

  const getGlowStyle = (score: number) => {
    if (score > 75) return "hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]";
    if (score >= 50) return "hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]";
    return "hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]";
  };

  const glowClass = getGlowStyle(targetScore);

  return (
    <div 
      key={targetScore} 
      title="Verification Match Confidence Score"
      className={`relative w-28 h-28 flex items-center justify-center cursor-help transition-all duration-300 ease-in-out hover:scale-110 ${glowClass}`}
    >
      <svg className="w-full h-full transform -rotate-90 will-change-[transform,opacity]" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-zinc-800/40"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={ringColor}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1.8s ease-out",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white">
          {currentScore}
        </span>
        <span className="text-[10px] text-zinc-500 font-bold uppercase">
          %
        </span>
      </div>
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [jobs, setJobs] = useState<JobReq[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [selectedRubric, setSelectedRubric] = useState<number | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [selectedScreening, setSelectedScreening] = useState<Screening | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.getCandidate(id);
      setCandidate(data);
      const [jobList, rubricList] = await Promise.all([api.listJobs(), api.listRubrics()]);
      setJobs(jobList || []);
      setRubrics(rubricList || []);
      if (jobList?.length) setSelectedJob(jobList[0].id);
      if (rubricList?.length) setSelectedRubric(rubricList[0].id);
      const runs = await api.screeningsForCandidate(id);
      setScreenings(runs || []);
      if (runs?.length) {
        setSelectedScreening(runs[0]);
      }
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Failed to retrieve candidate data.");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const sortedSkills = useMemo(() => {
    if (!candidate) return [];

    const skillCounts: Record<string, number> = {};
    const lowercaseSkills = candidate.skills.map(s => s.toLowerCase());

    lowercaseSkills.forEach(s => {
      skillCounts[s] = 0;
    });

    candidate.evidence.forEach((ev) => {
      const text = `${ev.title || ""} ${ev.snippet || ""}`.toLowerCase();
      lowercaseSkills.forEach((skill) => {
        if (text.includes(skill)) {
          skillCounts[skill] += 1;
        }
      });
    });

    return [...candidate.skills].sort((a, b) => {
      const countA = skillCounts[a.toLowerCase()] ?? 0;
      const countB = skillCounts[b.toLowerCase()] ?? 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return a.localeCompare(b);
    });
  }, [candidate]);

  async function screen() {
    setRunning(true);
    setStatus("Screening...");
    try {
      if (!selectedRubric && !selectedJob) {
        setStatus("Please select a rubric or a job requisition.");
        setRunning(false);
        return;
      }
      // Send both rubric_id and job_id to support dual-input semantic matching
      const res = await api.runScreening(id, selectedJob, selectedRubric);
      const runs = await api.screeningsForCandidate(id);
      setScreenings(runs || []);
      setSelectedScreening(res || runs[0] || null);
      setStatus(null);
    } catch (err: any) {
      setStatus(err.message || "Failed to run screening.");
    } finally {
      setRunning(false);
    }
  }

  async function exportPdf() {
    const element = document.getElementById("screening-dossier-card");
    if (!element) return;
    
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    
    const canvas = await html2canvas(element, {
      backgroundColor: "#09090b",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    
    let rubricName = "CustomRubric";
    if (selectedScreening) {
      if (selectedScreening.job_id) {
        const job = jobs.find(j => j.id === selectedScreening.job_id);
        rubricName = job ? job.title : `Job_${selectedScreening.job_id}`;
      } else if (selectedScreening.rubric_id) {
        const rubric = rubrics.find(r => r.id === selectedScreening.rubric_id);
        rubricName = rubric ? rubric.name : `Rubric_${selectedScreening.rubric_id}`;
      }
    }
    
    const cleanedCandidateName = (candidate?.full_name || "Candidate").replace(/[^a-zA-Z0-9]/g, "_");
    const cleanedRubricName = rubricName.replace(/[^a-zA-Z0-9]/g, "_");
    const score = selectedScreening?.overall_score || 0;
    
    pdf.save(`${cleanedCandidateName}_${cleanedRubricName}_${score}.pdf`);
  }

  const treeData = useMemo(() => {
    if (!candidate) return null;

    const platformMap: Record<string, { name: string; children: any[] }> = {
      github: { name: "GITHUB", children: [] },
      arxiv: { name: "ARXIV", children: [] },
      huggingface: { name: "HUGGINGFACE", children: [] },
    };

    candidate.evidence.forEach((ev) => {
      const src = ev.source ? ev.source.toLowerCase() : "";
      if (platformMap[src]) {
        const lowercaseText = `${ev.title} ${ev.snippet}`.toLowerCase();
        const leafChildren: any[] = [];
        if (lowercaseText.includes("python") || lowercaseText.includes(".py")) {
          leafChildren.push({ name: "Python", attributes: { type: "Language" } });
        }
        if (lowercaseText.includes("c++") || lowercaseText.includes("cpp")) {
          leafChildren.push({ name: "C++", attributes: { type: "Language" } });
        }
        if (lowercaseText.includes("javascript") || lowercaseText.includes("typescript") || lowercaseText.includes(".js") || lowercaseText.includes(".ts")) {
          leafChildren.push({ name: "JS/TS", attributes: { type: "Language" } });
        }

        platformMap[src].children.push({
          name: ev.title || ev.url || "Source Node",
          attributes: {
            snippet: ev.snippet ? (ev.snippet.substring(0, 30) + "...") : "No snippet metadata"
          },
          children: leafChildren
        });
      }
    });

    const platformChildren = Object.values(platformMap).filter(p => p.children.length > 0);

    return {
      name: candidate.full_name || "Candidate Entity",
      attributes: {
        skills: candidate.skills.slice(0, 2).join(", ")
      },
      children: platformChildren
    };
  }, [candidate]);

  if (!candidate) return <p className="muted">Loading candidate dossier...</p>;

  const renderRectSvgNode = ({ nodeDatum, toggleNode }: any) => {
    const isRoot = !nodeDatum.__rd3t.depth;
    const isPlatform = nodeDatum.__rd3t.depth === 1;
    const isLanguage = nodeDatum.attributes?.type === "Language";

    let rectColor = "#27272a";
    let strokeColor = "rgba(255, 255, 255, 0.1)";
    let width = 160;
    let height = 40;

    if (isRoot) {
      rectColor = "#1e3a8a";
      strokeColor = "#3b82f6";
      width = 180;
    } else if (isPlatform) {
      if (nodeDatum.name === "GITHUB") { rectColor = "#0f172a"; strokeColor = "#3b82f6"; }
      else if (nodeDatum.name === "ARXIV") { rectColor = "#2e1065"; strokeColor = "#a855f7"; }
      else if (nodeDatum.name === "HUGGINGFACE") { rectColor = "#422006"; strokeColor = "#eab308"; }
      width = 130;
    } else if (isLanguage) {
      rectColor = "#831843";
      strokeColor = "#ec4899";
      width = 90;
      height = 30;
    }

    return (
      <g>
        <rect
          width={width}
          height={height}
          x={-width / 2}
          y={-height / 2}
          rx={6}
          ry={6}
          fill={rectColor}
          stroke={strokeColor}
          strokeWidth={1.5}
          onClick={toggleNode}
          style={{ cursor: "pointer" }}
        />
        <text
          fill="#ffffff"
          strokeWidth={0}
          x={0}
          y={2}
          textAnchor="middle"
          style={{
            fontSize: isLanguage ? "9px" : "10px",
            fontFamily: "monospace",
            fontWeight: "bold",
            pointerEvents: "none"
          }}
        >
          {nodeDatum.name.length > 22 ? `${nodeDatum.name.substring(0, 19)}...` : nodeDatum.name}
        </text>
      </g>
    );
  };

  return (
    <div className="fade-in">
      {/* Top Header Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 36 }}>
        <div>
          <Link href="/candidates" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors duration-200 mb-4 w-fit">
            <ArrowLeft className="w-4 h-4" />
            Back to Directory
          </Link>
          <h1 style={{ fontSize: "3rem", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: 6, color: "#ffffff" }}>
            {candidate.full_name || "Candidate"}
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: 16, margin: 0 }}>
            <span>{candidate.primary_email}</span>
            {candidate.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                📍 {candidate.location}
              </span>
            )}
          </p>
        </div>

        <p style={{ fontSize: "1.125rem", color: "#d1d5db", lineHeight: "1.75", maxWidth: "800px", margin: "8px 0 0 0" }}>
          {candidate.bio}
        </p>

        {/* Skill tags outlines */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {sortedSkills.map((s) => (
            <span 
              key={s} 
              className="skill-pill"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#e4e4e7",
                padding: "4px 12px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: "500",
                textTransform: "lowercase"
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Option A: Premium Horizontal Command Center Panel */}
        <div className="card backdrop-blur-md bg-white/5 border border-white/10" style={{ marginBottom: 0 }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-6">
            Screening Command Center
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Horizontal Flex-Row Row */}
            <div style={{ display: "flex", flexDirection: "row", gap: 16, width: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Select Rubric
                </span>
                <select 
                  value={selectedRubric ?? ""} 
                  onChange={(e) => {
                    setSelectedRubric(e.target.value ? Number(e.target.value) : null);
                  }}
                  style={{ width: "100%", background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#ffffff", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
                >
                  <option value="">-- Choose Rubric --</option>
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
 
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Select Job:
                </span>
                <select 
                  value={selectedJob ?? ""} 
                  onChange={(e) => {
                    setSelectedJob(e.target.value ? Number(e.target.value) : null);
                  }}
                  style={{ width: "100%", background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#ffffff", padding: "8px 12px", borderRadius: "8px", fontSize: "13px" }}
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Massive Full-Width Pulsing Action Button */}
            <PrimaryButton 
              onClick={screen} 
              disabled={running || (!selectedRubric && !selectedJob)} 
              className="w-full py-3.5 text-sm uppercase tracking-wider animate-pulse"
            >
              {running && <span className="spinner" style={{ margin: "0 8px 0 0" }}></span>}
              {running ? "Processing screening..." : "▶ Launch Screening"}
            </PrimaryButton>
          </div>

          {status && (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }} className="muted">
              {status === "Screening..." && <span className="spinner"></span>}
              <span style={{ fontSize: 13 }}>{status === "Screening..." ? "Processing..." : status}</span>
            </div>
          )}
        </div>

        {/* Premium Verification Widget */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Source Verification & Confidence</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {candidate.identities.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No verified identity sources mapped.</p>
            ) : (
              candidate.identities.map((i, idx) => {
                const src = i.source.toLowerCase();
                const confidenceVal = Math.round((i.resolution_confidence ?? 0) * 100);

                let ringColor = "#ef4444";
                if (confidenceVal >= 80) ringColor = "#10b981";
                else if (confidenceVal >= 50) ringColor = "#f59e0b";

                let badgeBg = "rgba(113, 113, 122, 0.1)";
                let badgeBorder = "rgba(113, 113, 122, 0.2)";
                let icon = <Layers className="w-5 h-5 text-zinc-400" />;

                if (src === "github") {
                  badgeBg = "rgba(30, 58, 138, 0.5)";
                  badgeBorder = "rgba(59, 130, 246, 0.3)";
                  icon = <GitBranch className="w-5 h-5 text-blue-400" />;
                } else if (src === "arxiv") {
                  badgeBg = "rgba(88, 28, 135, 0.5)";
                  badgeBorder = "rgba(168, 85, 247, 0.3)";
                  icon = <BookOpen className="w-5 h-5 text-purple-400" />;
                } else if (src === "huggingface") {
                  badgeBg = "rgba(120, 53, 4, 0.5)";
                  badgeBorder = "rgba(234, 179, 8, 0.3)";
                  icon = <Layers className="w-5 h-5 text-yellow-500" />;
                }

                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-6 rounded-xl transition-all duration-200"
                    style={{
                      backgroundColor: badgeBg,
                      border: `1px solid ${badgeBorder}`
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-zinc-950/40 rounded-xl">
                        {icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                          {i.source}
                        </span>
                        <span className="text-sm font-extrabold text-white mt-1">
                          {i.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                        Match Score
                      </span>
                      <AnimatedConfidenceRing targetScore={confidenceVal} ringColor={ringColor} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedScreening && (
        <ScreeningDossier 
          candidate={candidate}
          screening={selectedScreening}
          onExportPdf={exportPdf}
        />
      )}

      {/* Horizontal Hierarchical Tree Flow Graph */}
      {treeData && (
        <div className="card bg-slate-900 border border-zinc-800 rounded-xl overflow-hidden relative p-0 mb-6">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-slate-950/60">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider m-0">Ecosystem Tree Flow</h3>
              <p className="text-[10px] text-zinc-500 m-0">Concentric horizontal flow-chart mapping platform sources, parsed repositories, and target languages.</p>
            </div>
          </div>

          <div className="relative w-full h-[600px] bg-slate-950">
            <Tree
              data={treeData}
              orientation="horizontal"
              nodeSize={{ x: 260, y: 80 }}
              translate={{ x: 100, y: 300 }}
              renderCustomNodeElement={renderRectSvgNode}
              pathClassFunc={() => "stroke-zinc-800 stroke-[1.5px] fill-none"}
              enableLegacyTransitions={true}
              transitionDuration={400}
            />
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Screening History / Audit Log</h3>
        {screenings.length === 0 ? (
          <p className="muted">No historical screenings found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Evaluation Context</th>
                <th>Recommendation</th>
                <th>Score</th>
                <th>Timestamp</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {screenings.map((s) => {
                let contextName = "Custom Rubric";
                if (s.job_id) {
                  const job = jobs.find(j => j.id === s.job_id);
                  contextName = job ? `Job: ${job.title}` : `Job #${s.job_id}`;
                } else if (s.rubric_id) {
                  const rubric = rubrics.find(r => r.id === s.rubric_id);
                  contextName = rubric ? `Rubric: ${rubric.name}` : `Rubric #${s.rubric_id}`;
                }
                const isSelected = selectedScreening?.id === s.id;

                return (
                  <tr key={s.id} style={{ background: isSelected ? "rgba(59, 130, 246, 0.05)" : "transparent" }}>
                    <td style={{ fontWeight: 600 }}>{contextName}</td>
                    <td>
                      <span className={`score-badge ${scoreClass(s.overall_score)}`} style={{ fontSize: 10, padding: "2px 6px" }}>
                        {scoreBadgeLabel(s.overall_score)}
                      </span>
                    </td>
                    <td><strong>{s.overall_score}/100</strong></td>
                    <td className="muted">{new Date(s.created_at).toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>
                      <button 
                        className="secondary" 
                        onClick={() => setSelectedScreening(s)}
                        style={{ 
                          fontSize: 11, 
                          padding: "4px 8px", 
                          textTransform: "none", 
                          borderColor: isSelected ? "var(--accent)" : "var(--border)" 
                        }}
                      >
                        {isSelected ? "Active View" : "View Details"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
