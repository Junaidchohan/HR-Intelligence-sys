"use client";

import { useEffect, useMemo, useState } from "react";
import { api, Company, Opportunity } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Search, Flame, Zap, Clock, Circle, Trash2, Target, Building2, Globe } from "lucide-react";

function formatElapsed(firstSeenAt: string): string {
  const diffMs = Date.now() - new Date(firstSeenAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return `${Math.max(0, diffMins)} mins`;
  }
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  if (diffHours < 24) {
    return `${diffHours}h ${remainingMins}m`;
  }
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${remainingHours}h`;
}

function LiveDuration({ firstSeenAt }: { firstSeenAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const diffMs = Date.now() - new Date(firstSeenAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) {
        setElapsed(`${Math.max(0, diffMins)} mins`);
        return;
      }
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      if (diffHours < 24) {
        setElapsed(`${diffHours}h ${remainingMins}m`);
        return;
      }
      const diffDays = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      setElapsed(`${diffDays} day${diffDays === 1 ? '' : 's'} ${remainingHours}h`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [firstSeenAt]);

  return <span>{elapsed}</span>;
}

// ─── Badges & Helpers ────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string | null }) {
  const t = (tier ?? "B").toUpperCase();
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    S: { bg: "rgba(168,85,247,0.15)", color: "#c084fc", border: "rgba(168,85,247,0.4)" },
    A: { bg: "rgba(16,185,129,0.15)",  color: "#34d399", border: "rgba(16,185,129,0.4)" },
    B: { bg: "rgba(245,158,11,0.15)",  color: "#fbbf24", border: "rgba(245,158,11,0.4)" },
    C: { bg: "rgba(161,161,170,0.15)", color: "#a1a1aa", border: "rgba(161,161,170,0.3)" },
  };
  const s = styles[t] ?? styles.B;
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.06em",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      TIER {t}
    </span>
  );
}

function UrgencyBadge({ band, firstSeenAt }: { band: string | null; firstSeenAt: string }) {
  const b = band ?? "Monitor";
  const styles: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
    Monitor:     { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", border: "rgba(59,130,246,0.35)",  icon: <Circle className="w-3.5 h-3.5" /> },
    Warming:     { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24", border: "rgba(245,158,11,0.35)",  icon: <Flame className="w-3.5 h-3.5" /> },
    "Action now":{ bg: "rgba(16,185,129,0.15)",  color: "#34d399", border: "rgba(16,185,129,0.4)",   icon: <Zap className="w-3.5 h-3.5" /> },
    "Follow-up": { bg: "rgba(239,68,68,0.15)",   color: "#f87171", border: "rgba(239,68,68,0.4)",    icon: <Clock className="w-3.5 h-3.5" /> },
  };
  const s = styles[b] ?? styles.Monitor;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ display: "inline-flex" }}>{s.icon}</span>
      <span>{b} (<LiveDuration firstSeenAt={firstSeenAt} />)</span>
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  fontWeight: 700,
};

// ─── Modal: New Company ──────────────────────────────────────────────────────

interface CompanyModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function CompanyModal({ onClose, onSaved }: CompanyModalProps) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [fundingStage, setFundingStage] = useState("Series A");
  const [headcount, setHeadcount] = useState<string>("");
  const [growthRate, setGrowthRate] = useState<string>("");
  const [tier, setTier] = useState("B");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createCompany({
        name: name.trim(),
        domain: domain.trim() || undefined,
        funding_stage: fundingStage,
        headcount: headcount ? parseInt(headcount, 10) : undefined,
        growth_rate: growthRate ? parseFloat(growthRate) : undefined,
        tier,
      });
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to create company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => (e.target as HTMLElement).dataset.backdrop && onClose()}
      data-backdrop="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "rgba(18,18,22,0.98)",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 20,
          padding: 32,
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏢 Add New Company</h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", boxShadow: "none" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Company Name *</label>
            <input
              placeholder="e.g. Anthropic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Domain</label>
              <input
                placeholder="e.g. anthropic.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Tier Rating *</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="S">⭐ Tier S (Top Priority)</option>
                <option value="A">🟢 Tier A (High Quality)</option>
                <option value="B">🟡 Tier B (Standard)</option>
                <option value="C">⚪ Tier C (Low Match)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Funding Stage</label>
              <select value={fundingStage} onChange={(e) => setFundingStage(e.target.value)}>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
                <option value="Series B">Series B</option>
                <option value="Series C">Series C</option>
                <option value="Series D">Series D+</option>
                <option value="Bootstrapped">Bootstrapped</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Headcount</label>
              <input
                type="number"
                placeholder="e.g. 150"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Growth Rate (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 35.0"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--bad)", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
              ⚠ {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
            <button className="secondary" onClick={onClose} style={{ fontSize: 13, padding: "8px 16px" }}>
              Cancel
            </button>
            <PrimaryButton onClick={handleSave} disabled={saving} className="text-xs px-4 py-2">
              {saving ? "Saving…" : "Save Company"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: New Opportunity ──────────────────────────────────────────────────

interface OpportunityModalProps {
  companies: Company[];
  selectedCompanyId?: number;
  onClose: () => void;
  onSaved: () => void;
}

function OpportunityModal({ companies, selectedCompanyId, onClose, onSaved }: OpportunityModalProps) {
  const [companyId, setCompanyId] = useState<number>(selectedCompanyId ?? (companies[0]?.id ?? 0));
  const [roleArchetype, setRoleArchetype] = useState("Agentic Engineer");
  const [urgencyBand, setUrgencyBand] = useState("Monitor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!companyId) {
      setError("Please select a target company.");
      return;
    }
    if (!roleArchetype.trim()) {
      setError("Role archetype is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createOpportunity({
        company_id: companyId,
        role_archetype: roleArchetype.trim(),
        urgency_band: urgencyBand,
      });
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to create opportunity.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(e) => (e.target as HTMLElement).dataset.backdrop && onClose()}
      data-backdrop="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "rgba(18,18,22,0.98)",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 20,
          padding: 32,
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Target className="w-5 h-5 text-blue-500" /> Add Role Opportunity
          </h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", boxShadow: "none" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Target Company *</label>
            <select value={companyId} onChange={(e) => setCompanyId(Number(e.target.value))}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.domain || "no domain"}) — Tier {c.tier || "B"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Role Archetype *</label>
            <select value={roleArchetype} onChange={(e) => setRoleArchetype(e.target.value)}>
              <option value="Agentic Engineer">Agentic Engineer</option>
              <option value="Applied AI Engineer">Applied AI Engineer</option>
              <option value="AI Infrastructure Engineer">AI Infrastructure Engineer</option>
              <option value="Research Scientist">Research Scientist</option>
              <option value="Foundational Model Engineer">Foundational Model Engineer</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Opened At</label>
              <input value={new Date().toLocaleString()} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>Initial Urgency Band</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {urgencyBand === "Monitor" && <Circle className="w-4 h-4 text-blue-400" />}
                {urgencyBand === "Warming" && <Flame className="w-4 h-4 text-yellow-500" />}
                {urgencyBand === "Action now" && <Zap className="w-4 h-4 text-green-400" />}
                {urgencyBand === "Follow-up" && <Clock className="w-4 h-4 text-red-400" />}
                <select value={urgencyBand} onChange={(e) => setUrgencyBand(e.target.value)} style={{ flex: 1 }}>
                  <option value="Monitor">Monitor (1-6 days)</option>
                  <option value="Warming">Warming (7-13 days)</option>
                  <option value="Action now">Action now (14-18 days)</option>
                  <option value="Follow-up">Follow-up (20+ days)</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--bad)", fontSize: 13, margin: 0, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
              ⚠ {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 8, justifyContent: "flex-end" }}>
            <button className="secondary" onClick={onClose} style={{ fontSize: 13, padding: "8px 16px" }}>
              Cancel
            </button>
            <PrimaryButton onClick={handleSave} disabled={saving} className="text-xs px-4 py-2">
              {saving ? "Saving…" : "Add Opportunity"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();

  async function loadData() {
    try {
      const data = await api.listCompanies();
      setCompanies(data);
    } catch (e: any) {
      console.error("Failed to load companies:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchDomain = (c.domain ?? "").toLowerCase().includes(q);
      const matchArchetype = c.opportunities.some((o) => o.role_archetype.toLowerCase().includes(q));
      return matchName || matchDomain || matchArchetype;
    });
  }, [companies, searchQuery]);

  async function handleDeleteCompany(c: Company) {
    if (!window.confirm(`Are you sure you want to delete company "${c.name}" and all its opportunities?`)) return;
    try {
      await api.deleteCompany(c.id);
      loadData();
    } catch (e: any) {
      alert(`Failed to delete company: ${e.message}`);
    }
  }

  async function handleDeleteOpportunity(opp: Opportunity) {
    if (!window.confirm(`Delete opportunity "${opp.role_archetype}"?`)) return;
    try {
      await api.deleteOpportunity(opp.id);
      loadData();
    } catch (e: any) {
      alert(`Failed to delete opportunity: ${e.message}`);
    }
  }

  if (loading) return <PageSkeleton type="list" />;

  return (
    <>
      {companyModalOpen && (
        <CompanyModal
          onClose={() => setCompanyModalOpen(false)}
          onSaved={() => {
            setCompanyModalOpen(false);
            loadData();
          }}
        />
      )}

      {oppModalOpen && (
        <OpportunityModal
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          onClose={() => setOppModalOpen(false)}
          onSaved={() => {
            setOppModalOpen(false);
            loadData();
          }}
        />
      )}

      <div className="fade-in" style={{ width: "100%" }}>
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Demand Side Command Center</h1>
            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 14 }}>
              Track prospective client companies, funding tiers, and open role opportunities.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="secondary"
              onClick={() => {
                if (companies.length === 0) {
                  alert("Please add a company first before adding an opportunity.");
                  return;
                }
                setSelectedCompanyId(companies[0]?.id);
                setOppModalOpen(true);
              }}
              style={{ fontSize: 13, padding: "8px 16px" }}
            >
              ＋ Add Opportunity
            </button>
            <PrimaryButton onClick={() => setCompanyModalOpen(true)} className="text-xs whitespace-nowrap">
              ＋ Add Company
            </PrimaryButton>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ marginBottom: 24, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 280 }}>
              <Search className="w-5 h-5 text-gray-400" />
              <input
                placeholder="Search companies by name, domain, or role archetype…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--text)", width: "100%", boxShadow: "none" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ background: "transparent", border: "none", boxShadow: "none", color: "var(--muted)", fontSize: 16, cursor: "pointer" }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--muted)" }}>
              <span>Total Companies: <strong style={{ color: "var(--text)" }}>{companies.length}</strong></span>
              <span>Open Opportunities: <strong style={{ color: "var(--text)" }}>{companies.reduce((sum, c) => sum + (c.opportunities?.length || 0), 0)}</strong></span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {companies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>No Target Companies Yet</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Build out your Demand Side pipeline by registering client companies and their active role opportunities.
            </p>
            <PrimaryButton onClick={() => setCompanyModalOpen(true)} className="text-xs px-5 py-2.5">
              ＋ Add First Company
            </PrimaryButton>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
            No companies found matching <strong>"{searchQuery}"</strong>.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {filteredCompanies.map((comp) => (
              <div
                key={comp.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  transition: "all 0.2s ease",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* Company Header Card Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(59,130,246,0.12)",
                        border: "1px solid rgba(59,130,246,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{comp.name}</h2>
                        <TierBadge tier={comp.tier} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 13, color: "var(--muted)" }}>
                        {comp.domain && (
                          <a
                            href={`https://${comp.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--accent)", textDecoration: "none" }}
                          >
                            <Globe className="w-3.5 h-3.5 inline-block mr-1" /> {comp.domain}
                          </a>
                        )}
                        <span>Stage: <strong>{comp.funding_stage || "Series A"}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSelectedCompanyId(comp.id);
                        setOppModalOpen(true);
                      }}
                      style={{ fontSize: 12, padding: "6px 12px" }}
                    >
                      ＋ Add Role Opportunity
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(comp)}
                      title="Delete Company"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171",
                        fontSize: 13,
                        padding: "6px 10px",
                        borderRadius: 8,
                        boxShadow: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Opportunities Table for Company */}
                {comp.opportunities && comp.opportunities.length > 0 ? (
                  <div style={{ overflowX: "auto", background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: "12px 16px" }}>
                    <table style={{ margin: 0, width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Role Archetype</th>
                          <th>First Seen</th>
                          <th>Duration Open</th>
                          <th>Urgency Band</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comp.opportunities.map((opp) => (
                          <tr key={opp.id}>
                            <td style={{ fontWeight: 600 }}>
                              <Target className="w-4 h-4 mr-1.5 inline-block text-blue-500" />
                              {opp.role_archetype}
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: 13 }}>
                              {new Date(opp.first_seen_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {formatElapsed(opp.first_seen_at)}
                              </span>
                            </td>
                            <td>
                              <UrgencyBadge band={opp.urgency_band} firstSeenAt={opp.first_seen_at} />
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                onClick={() => handleDeleteOpportunity(opp)}
                                title="Remove Opportunity"
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500 hover:text-red-400" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 10, fontSize: 13, color: "var(--muted)" }}>
                    No open role opportunities registered for {comp.name} yet. Click <strong>＋ Add Role Opportunity</strong> above to create one.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
