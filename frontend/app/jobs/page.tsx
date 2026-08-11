"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, JobReq, LeaderboardEntry, Rubric } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";
import { PageSkeleton, ShimmerBlock } from "@/components/ui/PageSkeleton";

// ─── helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--bad)";
}

function recLabel(rec: string): string {
  return rec.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
        <circle
          cx={28} cy={28} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 13, color,
      }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  const cfg: Record<string, { color: string; bg: string; border: string }> = {
    High:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)" },
    Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)" },
    Low:    { color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)" },
  };
  const p = priority ?? "Medium";
  const s = cfg[p] ?? cfg.Medium;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase",
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {p}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase",
      background: isActive ? "rgba(16,185,129,0.12)" : "rgba(161,161,170,0.12)",
      color: isActive ? "var(--good)" : "var(--muted)",
      border: `1px solid ${isActive ? "rgba(16,185,129,0.4)" : "rgba(161,161,170,0.3)"}`,
    }}>
      {isActive ? "Active" : "Filled"}
    </span>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyJobBoard() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "56px 24px", gap: 16, textAlign: "center",
    }}>
      {/* SVG Illustration */}
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="20" width="72" height="56" rx="8" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.25)" strokeWidth="2"/>
        <rect x="22" y="32" width="32" height="5" rx="2.5" fill="rgba(255,255,255,0.15)"/>
        <rect x="22" y="43" width="52" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
        <rect x="22" y="53" width="40" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
        <rect x="22" y="63" width="28" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
        <circle cx="72" cy="28" r="14" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)" strokeWidth="2"/>
        <text x="72" y="34" textAnchor="middle" fontSize="16" fill="rgba(59,130,246,0.8)">+</text>
      </svg>
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
          No active job requisitions yet
        </p>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, maxWidth: 340 }}>
          Create your first opening to start screening candidates and building your talent pipeline.
        </p>
      </div>
    </div>
  );
}

// ─── modal ───────────────────────────────────────────────────────────────────

interface JobFormData {
  title: string;
  description: string;
  rubric_id: number | null;
  client_name: string;
  priority: string;
}

interface EditModalProps {
  job: JobReq | null;
  rubrics: Rubric[];
  onClose: () => void;
  onSaved: () => void;
}

function JobModal({ job, rubrics, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState<JobFormData>({
    title: job?.title ?? "",
    description: job?.description ?? "",
    rubric_id: job?.rubric_id ?? (rubrics[0]?.id ?? null),
    client_name: job?.client_name ?? "",
    priority: job?.priority ?? "Medium",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!job;

  async function handleSave() {
    if (!form.title.trim()) { setError("Job title is required."); return; }
    if (!form.client_name.trim()) { setError("Client name is required."); return; }
    if (!form.rubric_id) { setError("Please select an evaluation rubric."); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updateJob(job!.id, {
          title: form.title,
          description: form.description || undefined,
          rubric_id: form.rubric_id,
          client_name: form.client_name,
          priority: form.priority,
        });
      } else {
        await api.createJob({
          title: form.title,
          description: form.description || undefined,
          rubric_id: form.rubric_id,
          client_name: form.client_name,
          priority: form.priority,
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).dataset.backdrop) onClose();
  }

  return (
    <div
      data-backdrop="true"
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{
        background: "rgba(18,18,22,0.98)",
        border: "1px solid rgba(59,130,246,0.25)",
        borderRadius: 20,
        padding: 32,
        width: "100%",
        maxWidth: 520,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)",
        animation: "fadeIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg,#fff 30%,var(--muted) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {isEdit ? "✎  Edit Job Requisition" : "＋  New Job Requisition"}
          </h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 20, padding: "4px 8px", cursor: "pointer", boxShadow: "none" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Job Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Job Title *</label>
            <input
              id="modal-job-title"
              placeholder="e.g. Senior ML Engineer"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Client Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Client Name *</label>
            <input
              id="modal-client-name"
              placeholder="e.g. OpenAI"
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Priority + Rubric in a row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Priority Level *</label>
              <select
                id="modal-priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="High">🔴  High</option>
                <option value="Medium">🟡  Medium</option>
                <option value="Low">🟢  Low</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Evaluation Rubric *</label>
              <select
                id="modal-rubric"
                value={form.rubric_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, rubric_id: Number(e.target.value) }))}
              >
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Description / Requirements</label>
            <textarea
              id="modal-description"
              placeholder="Key responsibilities, required skills, experience level…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ color: "var(--bad)", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
              ⚠ {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4, justifyContent: "flex-end" }}>
            <button className="secondary" onClick={onClose} style={{ fontSize: 13, padding: "8px 16px" }}>
              Cancel
            </button>
            <PrimaryButton id="modal-save-btn" onClick={handleSave} disabled={saving} className="text-xs px-4 py-2">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Job"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
  color: "var(--muted)", fontWeight: 700,
};

// ─── Leaderboard Panel ────────────────────────────────────────────────────────

interface LeaderboardPanelProps {
  jobId: number;
  jobTitle: string;
  onClose: () => void;
}

function LeaderboardPanel({ jobId, jobTitle, onClose }: LeaderboardPanelProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard(jobId).then((data) => {
      setEntries(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [jobId]);

  return (
    <div className="card" style={{ marginBottom: 0, animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🏆 Executive Leaderboard</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>{jobTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="secondary"
          style={{ fontSize: 12, padding: "5px 12px" }}
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 py-6 animate-pulse">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="w-10 h-10 rounded-full flex-shrink-0" />
            <ShimmerBlock className="h-4 w-48" />
          </div>
          <ShimmerBlock className="h-10 w-full rounded-xl" />
          <ShimmerBlock className="h-10 w-full rounded-xl" />
          <ShimmerBlock className="h-10 w-full rounded-xl" />
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            No candidates have been screened against this job yet.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 0" }}>
            Visit a candidate's profile and run a screening to see them ranked here.
          </p>
        </div>
      ) : (
        <div>
          {/* Top 3 shortlist note */}
          {entries.length >= 1 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontSize: 13, color: "#fbbf24" }}>
                Top {Math.min(3, entries.length)} candidate{entries.length > 1 ? "s" : ""} shortlisted for this role
              </span>
            </div>
          )}

          <table style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 48 }}>Rank</th>
                <th>Candidate</th>
                <th>Location</th>
                <th style={{ textAlign: "center" }}>AI Score</th>
                <th>Match</th>
                <th style={{ textAlign: "right" }}>Profile</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isTop3 = e.rank <= 3;
                return (
                  <tr key={e.candidate_id} style={isTop3 ? { background: "rgba(245,158,11,0.04)" } : {}}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isTop3 ? (
                          <span style={{ fontSize: 16 }}>
                            {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontWeight: 700, fontSize: 14 }}>
                            #{e.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isTop3 && (
                          <span title="Shortlisted" style={{ fontSize: 14, color: "#fbbf24" }}>⭐</span>
                        )}
                        <span style={{ fontWeight: 600 }}>
                          {e.candidate_name ?? `Candidate #${e.candidate_id}`}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>
                      {e.location ?? "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <ScoreRing score={e.overall_score} />
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: "3px 10px", borderRadius: 999, fontSize: 11,
                        fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                        ...(e.recommendation === "strong_match"
                          ? { background: "rgba(16,185,129,0.12)", color: "var(--good)", border: "1px solid rgba(16,185,129,0.3)" }
                          : e.recommendation === "possible_match"
                          ? { background: "rgba(245,158,11,0.12)", color: "var(--warn)", border: "1px solid rgba(245,158,11,0.3)" }
                          : { background: "rgba(239,68,68,0.12)", color: "var(--bad)", border: "1px solid rgba(239,68,68,0.3)" }),
                      }}>
                        {recLabel(e.recommendation)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/candidates/${e.candidate_id}`}
                        style={{
                          color: "var(--accent)", fontSize: 13, fontWeight: 600,
                          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
                        }}
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobReq[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobReq | null>(null);

  // Leaderboard state
  const [leaderboardJob, setLeaderboardJob] = useState<JobReq | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    const [j, r] = await Promise.all([api.listJobs(), api.listRubrics()]);
    setJobs(j);
    setRubrics(r);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-filtered jobs
  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const rubricName = rubrics.find((r) => r.id === j.rubric_id)?.name ?? "";
      return (
        j.title.toLowerCase().includes(q) ||
        (j.client_name ?? "").toLowerCase().includes(q) ||
        rubricName.toLowerCase().includes(q)
      );
    });
  }, [jobs, rubrics, searchQuery]);

  function openCreate() {
    setEditingJob(null);
    setModalOpen(true);
  }

  function openEdit(job: JobReq) {
    setEditingJob(job);
    setModalOpen(true);
  }

  async function handleDelete(job: JobReq) {
    const confirmed = window.confirm(
      `Are you sure you want to archive "${job.title}"?\n\nThis will permanently delete the job requisition.`
    );
    if (!confirmed) return;
    try {
      await api.deleteJob(job.id);
      if (leaderboardJob?.id === job.id) setLeaderboardJob(null);
      await load();
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  async function handleToggleFilled(job: JobReq) {
    const newStatus = job.status === "active" ? "filled" : "active";
    try {
      await api.updateJob(job.id, { status: newStatus });
      await load();
    } catch (e: any) {
      alert(`Failed to update status: ${e.message}`);
    }
  }

  function handleModalSaved() {
    setModalOpen(false);
    setEditingJob(null);
    load();
  }

  if (loading) {
    return <PageSkeleton type="list" />;
  }

  return (
    <>
      {modalOpen && (
        <JobModal
          job={editingJob}
          rubrics={rubrics}
          onClose={() => { setModalOpen(false); setEditingJob(null); }}
          onSaved={handleModalSaved}
        />
      )}

      <div className="fade-in">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">Job Requisitions</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>
              Manage your open roles and screen candidates against rubrics.
            </p>
          </div>
          <PrimaryButton id="create-job-btn" onClick={openCreate} className="text-xs whitespace-nowrap">
            ＋ New Job
          </PrimaryButton>
        </div>

        {/* ── Active Job Board ─────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          {/* Card header + search */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Active Job Board</h3>
            {/* Search bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "7px 14px", minWidth: 260,
            }}>
              <span style={{ fontSize: 15, color: "var(--muted)" }}>🔍</span>
              <input
                id="job-search"
                placeholder="Search title, client, rubric…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent", border: "none", padding: 0,
                  outline: "none", fontSize: 14, color: "var(--text)", flexGrow: 1,
                  boxShadow: "none",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent", border: "none", boxShadow: "none",
                    color: "var(--muted)", fontSize: 16, padding: "0 4px", cursor: "pointer",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {jobs.length === 0 ? (
            <EmptyJobBoard />
          ) : filteredJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 24px", color: "var(--muted)", fontSize: 14 }}>
              No jobs match <strong>"{searchQuery}"</strong>. Try a different search term.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Client</th>
                    <th>Priority</th>
                    <th>Rubric</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((j) => (
                    <tr key={j.id}>
                      <td style={{ fontWeight: 600 }}>{j.title}</td>
                      <td style={{ color: "var(--muted)" }}>{j.client_name ?? "—"}</td>
                      <td><PriorityBadge priority={j.priority} /></td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>
                        {rubrics.find((r) => r.id === j.rubric_id)?.name ?? `Rubric #${j.rubric_id}`}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={j.status} />
                          <button
                            onClick={() => handleToggleFilled(j)}
                            title={j.status === "active" ? "Mark as Filled" : "Mark as Active"}
                            style={{
                              background: "transparent", border: "1px solid var(--border)",
                              boxShadow: "none", padding: "2px 8px", fontSize: 10,
                              fontWeight: 600, color: "var(--muted)", borderRadius: 6,
                              letterSpacing: "0.04em", cursor: "pointer",
                              textTransform: "uppercase",
                            }}
                          >
                            {j.status === "active" ? "Mark Filled" : "Reopen"}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          {/* Leaderboard */}
                          <button
                            className="secondary"
                            onClick={() => setLeaderboardJob(leaderboardJob?.id === j.id ? null : j)}
                            style={{
                              fontSize: 11, padding: "5px 11px",
                              ...(leaderboardJob?.id === j.id
                                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                                : {}),
                            }}
                          >
                            🏆 Leaderboard
                          </button>
                          {/* Edit */}
                          <button
                            id={`edit-job-${j.id}`}
                            onClick={() => openEdit(j)}
                            title="Edit job"
                            style={{
                              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                              color: "#93c5fd", boxShadow: "none",
                              fontSize: 13, padding: "5px 10px", borderRadius: 8,
                            }}
                          >
                            ✎
                          </button>
                          {/* Delete */}
                          <button
                            id={`delete-job-${j.id}`}
                            onClick={() => handleDelete(j)}
                            title="Delete job"
                            style={{
                              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                              color: "#f87171", boxShadow: "none",
                              fontSize: 13, padding: "5px 10px", borderRadius: 8,
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Leaderboard Panel ─────────────────────────────────────────── */}
        {leaderboardJob && (
          <LeaderboardPanel
            jobId={leaderboardJob.id}
            jobTitle={leaderboardJob.title}
            onClose={() => setLeaderboardJob(null)}
          />
        )}
      </div>
    </>
  );
}
