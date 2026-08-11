"use client";

import { useEffect, useState } from "react";
import { api, Rubric } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

interface CriterionForm {
  name: string;
  weight: string;
  required_skills: string;
  min_evidence_count: string;
  description: string;
}

const emptyCriterion = (): CriterionForm => ({ name: "", weight: "", required_skills: "", min_evidence_count: "0", description: "" });

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState<CriterionForm[]>([emptyCriterion()]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRubrics(await api.listRubrics());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateCriterion(idx: number, field: keyof CriterionForm, value: string) {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }

  function addCriterion() {
    setCriteria((prev) => [...prev, emptyCriterion()]);
  }

  function removeCriterion(idx: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }

  function loadPreset() {
    setName("Senior AI ML Engineer");
    setCriteria([
      {
        name: "PyTorch Proficiency",
        weight: "0.4",
        required_skills: "pytorch, python",
        min_evidence_count: "2",
        description: "Hands-on experience implementing neural networks in PyTorch"
      },
      {
        name: "NLP & LLM Systems",
        weight: "0.35",
        required_skills: "nlp, transformers, deep learning",
        min_evidence_count: "1",
        description: "Experience training or fine-tuning transformer models"
      },
      {
        name: "MLOps & Cloud Infrastructure",
        weight: "0.25",
        required_skills: "docker, kubernetes, aws",
        min_evidence_count: "1",
        description: "Deploying and scaling models in production environments"
      }
    ]);
  }

  function startEdit(rubric: Rubric) {
    setEditingId(rubric.id);
    setName(rubric.name);
    setCriteria(rubric.criteria.map((c) => ({
      name: c.name,
      weight: c.weight.toString(),
      required_skills: (c.required_skills || []).join(", "),
      min_evidence_count: (c.min_evidence_count ?? 0).toString(),
      description: c.description || "",
    })));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setCriteria([emptyCriterion()]);
    setError(null);
  }

  async function handleDelete(id: number, rubricName: string) {
    if (!window.confirm(`Are you sure you want to delete the rubric "${rubricName}"?`)) {
      return;
    }
    try {
      await api.deleteRubric(id);
      setRubrics((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete rubric");
    }
  }

  async function submit() {
    setError(null);
    try {
      const payload = {
        name,
        criteria: criteria.map((c) => ({
          name: c.name,
          weight: parseFloat(c.weight) || 0,
          required_skills: c.required_skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
          min_evidence_count: parseInt(c.min_evidence_count || "0", 10),
          description: c.description,
        })),
      };

      if (editingId !== null) {
        await api.updateRubric(editingId, payload);
      } else {
        await api.createRubric(payload);
      }

      setName("");
      setCriteria([emptyCriterion()]);
      setEditingId(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const weightSum = criteria.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0);

  if (loading) return <PageSkeleton type="grid" className="max-w-7xl mx-auto px-2 py-4" />;

  return (
    <div className="fade-in">
      <h1>Evaluation Rubrics</h1>

      <div className="card w-full">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{editingId !== null ? "Update Evaluation Rubric" : "Create Evaluation Rubric"}</h3>
          <button className="secondary" onClick={loadPreset} style={{ fontSize: 12, padding: "6px 12px" }}>
            Load Example
          </button>
        </div>
        <input 
          placeholder="Rubric Name (e.g. Senior Machine Learning Engineer)" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          style={{ marginBottom: 16, width: "100%", padding: 12 }} 
        />
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          {criteria.map((c, idx) => (
            <div key={idx} className="card" style={{ background: "rgba(0, 0, 0, 0.3)", padding: 16, marginBottom: 0 }}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="col-span-3 flex flex-col gap-1">
                  <label style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Criterion Name</label>
                  <input placeholder="Core Language" value={c.name} onChange={(e) => updateCriterion(idx, "name", e.target.value)} style={{ width: "100%" }} />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Weight (0.0-1.0)</label>
                  <input placeholder="0.3" value={c.weight} onChange={(e) => updateCriterion(idx, "weight", e.target.value)} style={{ width: "100%" }} />
                </div>
                <div className="col-span-4 flex flex-col gap-1">
                  <label style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Required Skills</label>
                  <input placeholder="python, pytorch" value={c.required_skills} onChange={(e) => updateCriterion(idx, "required_skills", e.target.value)} style={{ width: "100%" }} />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Min Evidence</label>
                  <input placeholder="2" value={c.min_evidence_count} onChange={(e) => updateCriterion(idx, "min_evidence_count", e.target.value)} style={{ width: "100%" }} />
                </div>
                <div className="col-span-1">
                  <button className="secondary w-full" onClick={() => removeCriterion(idx)} style={{ padding: "10px 0", color: "var(--bad)" }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <button className="secondary" onClick={addCriterion}>+ Add Criterion</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: Math.abs(weightSum - 1.0) < 0.0001 ? "var(--good)" : "var(--warn)" }}>
            Weight Sum: {weightSum.toFixed(2)} / 1.00
          </span>
        </div>

        <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", gap: 12, justifyContent: "flex-end" }}>
          {editingId !== null && (
            <button className="secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
          <PrimaryButton onClick={submit} disabled={Math.abs(weightSum - 1.0) >= 0.0001 || !name.trim()}>
            {editingId !== null ? "Update Rubric" : "Create Rubric"}
          </PrimaryButton>
        </div>
        {error && <p style={{ color: "var(--bad)", fontSize: 13, marginTop: 12, textAlign: "right" }}>{error}</p>}
      </div>

      <div className="mt-8">
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Existing Evaluation Rubrics</h3>
        <div className="overflow-y-auto max-h-[400px] flex flex-col gap-4 pr-2">
          {rubrics.map((r) => (
            <div key={r.id} className="card w-full h-52 flex justify-between p-6 m-0">
              <div className="flex flex-col w-full pr-6 overflow-y-auto">
                <strong className="text-2xl text-white mb-4 block">{r.name}</strong>
                <div className="flex flex-wrap gap-2">
                  {r.criteria.map((c: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300">
                      <strong className="text-white">{c.name}</strong> ({c.weight})
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 justify-center min-w-[120px] border-l border-white/10 pl-6">
                <button className="secondary w-full" onClick={() => startEdit(r)} style={{ padding: "8px 12px", textTransform: "none" }}>
                  ✎ Edit
                </button>
                <button className="secondary w-full" onClick={() => handleDelete(r.id, r.name)} style={{ padding: "8px 12px", textTransform: "none", color: "var(--bad)", borderColor: "rgba(239, 68, 68, 0.4)" }}>
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
