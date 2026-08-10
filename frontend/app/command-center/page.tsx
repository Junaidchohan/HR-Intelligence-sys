"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface CandidateMatch {
  screening_id: number;
  candidate_id: number;
  full_name: string;
  location?: string | null;
  overall_score: number;
  recommendation: string;
  summary?: string | null;
  skills: string[];
  confidence_score?: number | null;
}

interface OpportunityMatch {
  opportunity_id: number;
  company_id: number;
  company_name: string;
  company_tier: string;
  role_archetype: string;
  days_open: number;
  urgency_band: string;
  first_seen_at: string;
  matching_candidates: CandidateMatch[];
}

export default function CommandCenterPage() {
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUrgency, setFilterUrgency] = useState<string>("Action now");
  const [recomputing, setRecomputing] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Outreach Touch Modal State
  const [touchModalOpen, setTouchModalOpen] = useState<boolean>(false);
  const [touchTarget, setTouchTarget] = useState<{ entity_type: string; entity_id: number; name: string } | null>(null);
  const [touchChannel, setTouchChannel] = useState<string>("LinkedIn");
  const [touchOutcome, setTouchOutcome] = useState<string>("Connected");
  const [touchNotes, setTouchNotes] = useState<string>("");
  const [submittingTouch, setSubmittingTouch] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [filterUrgency]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCommandCenterMatches(filterUrgency === "All" ? undefined : filterUrgency);
      setMatches(data);
      if (data.length > 0 && (!selectedOppId || !data.some((m) => m.opportunity_id === selectedOppId))) {
        setSelectedOppId(data[0].opportunity_id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load command center data");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecomputeUrgency() {
    setRecomputing(true);
    setMsg(null);
    try {
      const res = await api.recomputeUrgency();
      setMsg(`Urgency recomputed! ${res.updated_opportunities} opportunities updated.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to recompute urgency");
    } finally {
      setRecomputing(false);
    }
  }

  async function handleLogTouch(e: React.FormEvent) {
    e.preventDefault();
    if (!touchTarget) return;
    setSubmittingTouch(true);
    try {
      await api.createTouch({
        entity_type: touchTarget.entity_type,
        entity_id: touchTarget.entity_id,
        channel: touchChannel,
        outcome: touchOutcome,
        notes: touchNotes,
      });
      setMsg(`Logged outreach touch for ${touchTarget.name}!`);
      setTouchModalOpen(false);
      setTouchNotes("");
    } catch (err: any) {
      alert(err.message || "Failed to log touch event");
    } finally {
      setSubmittingTouch(false);
    }
  }

  const selectedOpp = matches.find((m) => m.opportunity_id === selectedOppId) || matches[0];

  const getUrgencyBadgeClass = (band: string) => {
    switch (band) {
      case "Action now":
        return "badge badge-success";
      case "Warming":
        return "badge badge-warning";
      case "Follow-up":
        return "badge badge-info";
      default:
        return "badge badge-secondary";
    }
  };

  const getVerdictBadgeClass = (verdict: string) => {
    if (verdict.includes("GREEN") || verdict.includes("Strong")) return "badge badge-success";
    if (verdict.includes("YELLOW") || verdict.includes("Consider")) return "badge badge-warning";
    return "badge badge-danger";
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ─── Header Section ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-[#space-between]", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Command Center (The Join Layer)</h1>
          <p style={{ color: "#9ca3af", margin: "4px 0 0 0", fontSize: 14 }}>
            Demand-side urgency window joined automatically with Supply-side candidate inventory.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="secondary" onClick={handleRecomputeUrgency} disabled={recomputing}>
            {recomputing ? "Recomputing..." : "⚡ Recompute Urgency"}
          </button>
          <Link href="/companies">
            <button className="primary">+ Add Lead</button>
          </Link>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", marginBottom: 20, padding: 12 }}>
          {msg}
        </div>
      )}

      {error && (
        <div className="card" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", marginBottom: 20, padding: 12 }}>
          {error}
        </div>
      )}

      {/* ─── Urgency Band Filter Tabs ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["Action now", "Warming", "Follow-up", "Monitor", "All"].map((tab) => (
          <button
            key={tab}
            className={filterUrgency === tab ? "primary" : "secondary"}
            onClick={() => setFilterUrgency(tab)}
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            {tab === "Action now" ? "🔥 Action now (Sweet Spot)" : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          Loading Join Layer matches...
        </div>
      ) : matches.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 16, color: "#9ca3af" }}>No opportunities found in &quot;{filterUrgency}&quot; urgency band.</p>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Add target companies and roles in Demand side or click &quot;⚡ Recompute Urgency&quot;.</p>
        </div>
      ) : (
        /* ─── Split View Layout ────────────────────────────────────────── */
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, alignItems: "start" }}>
          
          {/* ─── Left Pane: Demand-side Action Queue ────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px 0", color: "#e5e7eb" }}>
              Demand Action Queue ({matches.length})
            </h2>

            {matches.map((item) => {
              const isSelected = selectedOppId === item.opportunity_id;
              return (
                <div
                  key={item.opportunity_id}
                  className="card"
                  onClick={() => setSelectedOppId(item.opportunity_id)}
                  style={{
                    cursor: "pointer",
                    border: isSelected ? "2px solid #8b5cf6" : "1px solid rgba(255, 255, 255, 0.1)",
                    background: isSelected ? "rgba(139, 92, 246, 0.08)" : "rgba(17, 24, 39, 0.6)",
                    transition: "all 0.2s ease",
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", letterSpacing: "0.5px" }}>
                        TIER {item.company_tier}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: "2px 0 0 0", color: "#f9fafb" }}>
                        {item.company_name}
                      </h3>
                    </div>
                    <span className={getUrgencyBadgeClass(item.urgency_band)} style={{ fontSize: 11 }}>
                      {item.urgency_band}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, color: "#d1d5db", margin: "4px 0 10px 0", fontWeight: 500 }}>
                    {item.role_archetype}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9ca3af", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span>⏱️ {item.days_open} days open</span>
                    <span>🎯 {item.matching_candidates.length} candidates fit</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Right Pane: Supply Inventory Matching ──────────────── */}
          <div>
            {selectedOpp ? (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div>
                    <span style={{ fontSize: 12, textTransform: "uppercase", color: "#9ca3af", letterSpacing: "1px" }}>
                      TARGET OPPORTUNITY
                    </span>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0 0", color: "#f9fafb" }}>
                      {selectedOpp.role_archetype} @ {selectedOpp.company_name}
                    </h2>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setTouchTarget({ entity_type: "company", entity_id: selectedOpp.company_id, name: selectedOpp.company_name });
                      setTouchModalOpen(true);
                    }}
                    style={{ fontSize: 12 }}
                  >
                    📞 Log Client Outreach
                  </button>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "#e5e7eb" }}>
                  Matching Supply Candidate Inventory ({selectedOpp.matching_candidates.length})
                </h3>

                {selectedOpp.matching_candidates.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                    No screened candidates fit this archetype yet. Ingest candidates or run a batch screening.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {selectedOpp.matching_candidates.map((cand, idx) => (
                      <div
                        key={cand.candidate_id}
                        style={{
                          background: "rgba(31, 41, 55, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 8,
                          padding: 16,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6" }}>#{idx + 1}</span>
                              <Link
                                href={`/candidates/${cand.candidate_id}`}
                                style={{ fontSize: 16, fontWeight: 600, color: "#60a5fa", textDecoration: "none" }}
                              >
                                {cand.full_name}
                              </Link>
                              {cand.location && (
                                <span style={{ fontSize: 12, color: "#9ca3af" }}>• {cand.location}</span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span className={getVerdictBadgeClass(cand.recommendation)} style={{ fontSize: 11 }}>
                              {cand.recommendation}
                            </span>
                            <div style={{ background: "rgba(139, 92, 246, 0.2)", color: "#c084fc", fontWeight: 700, padding: "4px 10px", borderRadius: 12, fontSize: 13 }}>
                              {Math.round(cand.overall_score)}/100
                            </div>
                          </div>
                        </div>

                        {cand.summary && (
                          <p style={{ fontSize: 13, color: "#d1d5db", margin: "8px 0", lineHeight: 1.5 }}>
                            {cand.summary}
                          </p>
                        )}

                        {cand.skills && cand.skills.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
                            {cand.skills.map((skill) => (
                              <span key={skill} style={{ background: "rgba(255,255,255,0.06)", fontSize: 11, padding: "2px 8px", borderRadius: 4, color: "#9ca3af" }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <Link href={`/candidates/${cand.candidate_id}`} style={{ fontSize: 12, color: "#60a5fa" }}>
                            View Candidate Ledger →
                          </Link>
                          <button
                            className="secondary"
                            onClick={() => {
                              setTouchTarget({ entity_type: "candidate", entity_id: cand.candidate_id, name: cand.full_name });
                              setTouchModalOpen(true);
                            }}
                            style={{ fontSize: 12, padding: "4px 10px" }}
                          >
                            ✉️ Log Candidate Outreach
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── Log Outreach Touch Modal ───────────────────────────────────── */}
      {touchModalOpen && touchTarget && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div className="card" style={{ width: 440, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16 0" }}>
              Log Outreach Touch for {touchTarget.name}
            </h3>
            <form onSubmit={handleLogTouch} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Channel</label>
                <select
                  value={touchChannel}
                  onChange={(e) => setTouchChannel(e.target.value)}
                  style={{ width: "100%", padding: 8, background: "#1f2937", border: "1px solid #374151", color: "#fff", borderRadius: 6 }}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Email">Email</option>
                  <option value="Call">Direct Phone Call</option>
                  <option value="Deck">Personalized Deck</option>
                  <option value="In-Person">In-Person Meeting</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Outcome</label>
                <select
                  value={touchOutcome}
                  onChange={(e) => setTouchOutcome(e.target.value)}
                  style={{ width: "100%", padding: 8, background: "#1f2937", border: "1px solid #374151", color: "#fff", borderRadius: 6 }}
                >
                  <option value="Connected">Connected / Reached Out</option>
                  <option value="Replied">Replied to Pitch</option>
                  <option value="Interested">Interested / Interview Scheduled</option>
                  <option value="No Response">No Response</option>
                  <option value="Converted">Converted to Engagement</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 4 }}>Outreach Notes</label>
                <textarea
                  value={touchNotes}
                  onChange={(e) => setTouchNotes(e.target.value)}
                  placeholder="e.g. Sent 3-touch sequence with custom pitch deck..."
                  rows={3}
                  style={{ width: "100%", padding: 8, background: "#1f2937", border: "1px solid #374151", color: "#fff", borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" className="secondary" onClick={() => setTouchModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={submittingTouch}>
                  {submittingTouch ? "Logging..." : "Log Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
