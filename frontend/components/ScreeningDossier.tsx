import React, { useMemo, useEffect, useState } from "react";
import { Brain, FileText, Award, ShieldCheck, AlertCircle, ExternalLink, CheckCircle } from "lucide-react";
import { CandidateDetail, Screening } from "@/lib/api";
import PrimaryButton from "./PrimaryButton";

interface ScreeningDossierProps {
  candidate: CandidateDetail;
  screening: Screening;
  onExportPdf: () => void;
}

// Reusable animated ring component for the dossier panels
function AnimatedDossierRing({ 
  targetScore, 
  ringColor, 
  glowClass, 
  title, 
  labelNode 
}: { 
  targetScore: number; 
  ringColor: string; 
  glowClass: string; 
  title: string; 
  labelNode: (animatedScore: number) => React.ReactNode;
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const [strokeOffset, setStrokeOffset] = useState(circumference);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setStrokeOffset(circumference);
    setAnimatedScore(0);

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
      setAnimatedScore(val);

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

  return (
    <div 
      key={targetScore} 
      title={title}
      className={`relative w-28 h-28 flex items-center justify-center cursor-help transition-all duration-300 ease-in-out hover:scale-110 ${glowClass}`}
    >
      <svg className="w-full h-full transform -rotate-90 will-change-[transform,opacity]" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-zinc-800/60"
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
      <div className="absolute flex flex-col items-center justify-center text-center px-1">
        {labelNode(animatedScore)}
      </div>
    </div>
  );
}

export default function ScreeningDossier({ candidate, screening, onExportPdf }: ScreeningDossierProps) {
  if (!screening || !candidate) {
    return <div className="muted p-4 border border-zinc-800 rounded-xl">Loading scorecard...</div>;
  }

  const overall_score = screening.overall_score ?? 0;
  const summary = screening.summary ?? "";
  const citation_valid_ratio = screening.citation_valid_ratio ?? 1.0;
  const criterion_scores = screening.criterion_scores ?? [];

  // Color logic for overall score
  const getScoreColor = (score: number) => {
    if (score > 75) return "#10b981"; // Green
    if (score >= 50) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  const scoreColor = getScoreColor(overall_score);

  const getGlowStyle = (score: number) => {
    if (score > 75) return "hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]";
    if (score >= 50) return "hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]";
    return "hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]";
  };

  const scoreGlowClass = getGlowStyle(overall_score);

  // Status mapping
  const getStatusDetails = (score: number) => {
    if (score > 75) {
      return {
        text: "Top Talent",
        icon: <Award className="w-4 h-4 text-emerald-400" />
      };
    } else if (score >= 50) {
      return {
        text: "Good Match",
        icon: <ShieldCheck className="w-4 h-4 text-amber-400" />
      };
    } else {
      return {
        text: "Consider",
        icon: <AlertCircle className="w-4 h-4 text-rose-400" />
      };
    }
  };

  const statusDetails = getStatusDetails(overall_score);

  // Calculate evidence source counts
  const allEvidence = candidate.evidence || [];
  const sourceCounts = allEvidence.reduce((acc: Record<string, number>, ev) => {
    const src = ev.source ? ev.source.toLowerCase() : "other";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const totalEv = allEvidence.length || 1;
  const githubPct = Math.round(((sourceCounts.github || 0) / totalEv) * 100);
  const arxivPct = Math.round(((sourceCounts.arxiv || 0) / totalEv) * 100);

  // Map and collect Top Evidence Citations
  const topCitations = useMemo(() => {
    const matchedSet = new Set<number>();
    const list: any[] = [];
    
    criterion_scores.forEach((cs) => {
      const matchedSkills = cs?.matched_skills || [];
      allEvidence.forEach((ev) => {
        if (matchedSet.has(ev.id)) return;
        const text = `${ev.snippet || ""} ${ev.title || ""}`.toLowerCase();
        const matchesSkill = matchedSkills.some(skill => text.includes(skill.toLowerCase()));
        if (matchesSkill) {
          matchedSet.add(ev.id);
          list.push(ev);
        }
      });
    });

    if (list.length === 0) {
      return allEvidence.slice(0, 4);
    }
    return list;
  }, [criterion_scores, allEvidence]);

  const formatSource = (src: string) =>
    src === "github" ? "GitHub" :
    src === "arxiv" ? "arXiv" :
    src === "huggingface" ? "HuggingFace" : src;

  return (
    <div 
      id="screening-dossier-card"
      className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-zinc-700/60"
    >
      {/* Background orb */}
      <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full filter blur-[100px] opacity-10 pointer-events-none bg-blue-500" />

      {/* Header Info Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-6 relative z-10">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            Screening Dossier
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Automated intelligence review mapped to job requirements and evaluation rubrics.
          </p>
        </div>
        <PrimaryButton 
          onClick={onExportPdf} 
          className="text-xs px-4 py-2"
        >
          <FileText className="w-3.5 h-3.5" />
          Export PDF Report
        </PrimaryButton>
      </div>

      {/* 3 Circular Progress Charts (Side-by-Side) */}
      <div className="flex flex-row justify-around items-center bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 mb-6 gap-4 relative z-10">
        
        {/* 1. Overall Score Circle */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Match Rating</span>
          <AnimatedDossierRing 
            targetScore={overall_score} 
            ringColor={scoreColor} 
            glowClass={scoreGlowClass} 
            title="Overall Screening Match Score"
            labelNode={(current) => (
              <>
                <span className="text-2xl font-extrabold text-white">{current}</span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">/ 100</span>
              </>
            )}
          />
        </div>

        {/* 2. Status Circle (Middle) */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Match Status</span>
          <AnimatedDossierRing 
            targetScore={overall_score} 
            ringColor={scoreColor} 
            glowClass={scoreGlowClass} 
            title="Screening Match Status Rating"
            labelNode={(_current) => (
              <>
                <div className="mb-0.5">{statusDetails.icon}</div>
                <span className="text-[9px] font-extrabold text-white tracking-tight uppercase leading-none">
                  {statusDetails.text}
                </span>
              </>
            )}
          />
        </div>

        {/* 3. Citations Circle (Right) */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Citations</span>
          <AnimatedDossierRing 
            targetScore={Math.round(citation_valid_ratio * 100)} 
            ringColor="#10b981" 
            glowClass="hover:drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" 
            title="Validated Citation References Ratio"
            labelNode={(current) => (
              <>
                <div className="mb-0.5"><CheckCircle className="w-4 h-4 text-emerald-400" /></div>
                <span className="text-[9px] font-extrabold text-emerald-400 tracking-tight uppercase leading-none">
                  {current}% Valid
                </span>
              </>
            )}
          />
        </div>

        {/* 4. Analysis Confidence Circle */}
        {screening.confidence_score !== undefined && screening.confidence_score !== null && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Match Confidence</span>
            <AnimatedDossierRing 
              targetScore={Math.round(screening.confidence_score)} 
              ringColor={getScoreColor(screening.confidence_score)} 
              glowClass={getGlowStyle(screening.confidence_score)} 
              title="Dual-Input Semantic Analysis Match Confidence Score"
              labelNode={(current) => (
                <>
                  <span className="text-2xl font-extrabold text-white">{current}%</span>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">Confidence</span>
                </>
              )}
            />
          </div>
        )}

      </div>

      <div className="space-y-6 relative z-10">
        {/* Executive Summary */}
        <div className="bg-gradient-to-br from-zinc-850 to-zinc-900/40 border border-zinc-700/40 rounded-2xl p-4 shadow-lg">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            Executive Summary
          </h4>
          <p className="text-sm leading-relaxed text-zinc-200 font-normal">
            {summary || "No executive summary generated for this screening."}
          </p>
        </div>

        {/* Sleek Gradient Progress Bars Performance Map */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">
            Talent Shape Performance Map
          </h4>
          
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-6">
            {criterion_scores.map((cs, idx) => {
              const score = cs.raw_score ?? 0;
              const weight = cs.weight ?? 1;

              return (
                <div key={cs.name || `map-bar-${idx}`} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-200">{cs.name}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-white">{score} <span className="text-[10px] font-normal text-zinc-500">/ 100</span></span>
                      <span className="text-[10px] text-zinc-500 font-medium">weight: {weight}</span>
                    </div>
                  </div>

                  {/* Outer progress track */}
                  <div className="relative w-full h-4 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                    {/* Target score line overlay (70% standard) */}
                    <div className="absolute left-[70%] top-0 bottom-0 w-[1px] border-l border-dashed border-zinc-700 z-10 pointer-events-none" />

                    {/* Gradient fill progress bar */}
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-400"
                      style={{ 
                        width: `${score}%`,
                        boxShadow: "0 0 8px rgba(34, 211, 238, 0.3)"
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">{cs.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Citations Grid Section */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Top Evidence Citations
            </h4>
            
            {/* Sleek Source Distribution Component */}
            <div className="flex items-center gap-3 bg-zinc-900/30 border border-zinc-850 px-3 py-1 rounded-lg">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Source Mix:</span>
              <div className="flex gap-2.5 text-[10px] font-bold">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> GitHub {githubPct}%
                </span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> arXiv {arxivPct}%
                </span>
              </div>
            </div>
          </div>

          <div 
            className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none"
            }}
          >
            {topCitations.map((ev) => {
              // Parse language logic
              const lowercaseText = `${ev.title || ""} ${ev.snippet || ""}`.toLowerCase();
              let detectedLang = "";
              if (lowercaseText.includes("python") || lowercaseText.includes(".py")) {
                detectedLang = "Python";
              } else if (lowercaseText.includes("c++") || lowercaseText.includes("cpp")) {
                detectedLang = "C++";
              }

              return (
                <a
                  key={ev.id}
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-[290px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all duration-300 group text-left cursor-pointer relative"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase font-extrabold tracking-widest text-zinc-400">
                      {formatSource(ev.source)}
                    </span>
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                      {ev.title || "Untitled Reference"}
                    </p>

                    {/* Evidence snippet — the verbatim text proving the skill claim */}
                    {ev.snippet && (
                      <div className="border-l-2 border-slate-700 pl-3 mt-1">
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 break-words">
                          {ev.snippet}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end w-full mt-3">
                    {detectedLang ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {detectedLang}
                      </span>
                    ) : (
                      <span />
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-300 transition-colors flex-shrink-0" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
