// All API calls go to /api/* on the same domain.
// Next.js (next.config.js rewrites) proxies them server-side to the real backend.
// This means: no CORS issues, no build-time env var needed.
const API_BASE = "/api";


export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string) {
  window.localStorage.setItem("token", token);
}

export function clearToken() {
  window.localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fullUrl = `${API_BASE}${path}`;
  console.log("Calling URL:", fullUrl);

  try {
    const res = await fetch(fullUrl, { ...options, headers });

    // Read the body exactly ONCE as text — a Response body stream can only
    // be consumed once, so we must not call res.json() AND res.text().
    const text = await res.text();

    if (!res.ok) {
      let errorMessage = `API ${res.status}`;
      try {
        const errorData = JSON.parse(text);
        if (errorData && errorData.detail) {
          errorMessage =
            typeof errorData.detail === "string"
              ? errorData.detail
              : JSON.stringify(errorData.detail);
        }
      } catch {
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }

    if (res.status === 204 || text === "") return undefined as unknown as T;
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Full Error Object:", error);
    throw error;
  }
}

export interface Candidate {
  id: number;
  full_name: string | null;
  primary_email: string | null;
  location: string | null;
  bio: string | null;
  skills: string[];
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: number;
  source: string;
  evidence_type: string;
  title: string | null;
  url: string;
  snippet: string | null;
  collected_at: string;
}

export interface CandidateDetail extends Candidate {
  evidence: Evidence[];
  identities: Array<{ source: string; username: string | null; resolution_reason: string | null; resolution_confidence: number | null }>;
}

export interface Rubric {
  id: number;
  name: string;
  criteria: Array<{ name: string; weight: number; required_skills: string[]; min_evidence_count: number; description: string }>;
}

export interface JobReq {
  id: number;
  title: string;
  description: string | null;
  rubric_id: number;
  client_name: string | null;
  priority: string | null;
  status: string;
}

export interface LeaderboardEntry {
  rank: number;
  candidate_id: number;
  candidate_name: string | null;
  location: string | null;
  overall_score: number;
  recommendation: string;
  job_id: number | null;
}

export interface Screening {
  id: number;
  candidate_id: number;
  job_id: number | null;
  rubric_id: number | null;
  overall_score: number;
  recommendation: string;
  criterion_scores: Array<{ name: string; weight: number; raw_score: number; weighted_score: number; matched_skills: string[]; explanation: string }>;
  summary: string | null;
  citation_valid_ratio: number | null;
  confidence_score?: number | null;
  created_at: string;
}

export interface Opportunity {
  id: number;
  company_id: number;
  role_archetype: string;
  first_seen_at: string;
  days_open: number;
  urgency_band: string | null;
  created_at: string;
}

export interface Company {
  id: number;
  name: string;
  domain: string | null;
  funding_stage: string | null;
  headcount: number | null;
  growth_rate: number | null;
  tier: string | null;
  enrichment_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
  opportunities: Opportunity[];
}

export interface CompanyCreatePayload {
  name: string;
  domain?: string;
  funding_stage?: string;
  headcount?: number;
  growth_rate?: number;
  tier?: string;
}

export interface OpportunityCreatePayload {
  company_id: number;
  role_archetype: string;
  urgency_band?: string;
}

export const api = {

  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, role = "recruiter") =>
    request<{ access_token: string; token_type: string }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, role }) }),
  me: () => request("/auth/me"),

  listCandidates: () => request<Candidate[]>("/candidates"),
  getCandidate: (id: number) => request<CandidateDetail>(`/candidates/${id}`),
  ingestCandidate: (source: string, identifier: string) => {
    const url = `${API_BASE}/candidates/ingest`;
    console.log("Calling URL:", url);
    return request<{ candidate_id: number; is_new: boolean; resolution_reason: string; resolution_confidence: number; evidence_count: number }>(
      "/candidates/ingest",
      { method: "POST", body: JSON.stringify({ source, identifier }) }
    ).catch((error) => {
      console.error("Full Error Object:", error);
      throw error;
    });
  },
  searchCandidates: (q: string) => request<Array<{ candidate: Candidate; match_reason: string }>>(`/candidates/search?q=${encodeURIComponent(q)}`),
  searchGithubUser: (username: string) => request<any>(`/candidates/search-github/${encodeURIComponent(username)}`),

  listRubrics: () => request<Rubric[]>("/rubrics"),
  createRubric: (payload: { name: string; criteria: Rubric["criteria"] }) =>
    request<Rubric>("/rubrics", { method: "POST", body: JSON.stringify(payload) }),

  listJobs: () => request<JobReq[]>("/job-requisitions"),
  createJob: (payload: { title: string; description?: string; rubric_id: number; client_name?: string; priority?: string }) =>
    request<JobReq>("/job-requisitions", { method: "POST", body: JSON.stringify(payload) }),
  updateJob: (id: number, payload: { title?: string; description?: string; rubric_id?: number; client_name?: string; priority?: string; status?: string }) =>
    request<JobReq>(`/job-requisitions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteJob: (id: number) => request<void>(`/job-requisitions/${id}`, { method: "DELETE" }),
  getLeaderboard: (job_id: number) => request<LeaderboardEntry[]>(`/job-requisitions/leaderboard/${job_id}`),

  runScreening: (candidate_id: number, job_id?: number | null, rubric_id?: number | null) =>
    request<Screening>("/screenings", { method: "POST", body: JSON.stringify({ candidate_id, job_id, rubric_id }) }),
  screeningsForJob: (job_id: number) => request<Screening[]>(`/screenings/job/${job_id}`),
  screeningsForCandidate: (candidate_id: number) => request<Screening[]>(`/screenings/candidate/${candidate_id}`),

  getSettings: () => request<IntegrationSettingsOut>("/settings"),
  saveSettings: (payload: { github_token?: string; anthropic_api_key?: string; openai_api_key?: string }) =>
    request<IntegrationSettingsOut>("/settings", { method: "POST", body: JSON.stringify(payload) }),
  deleteCandidate: (id: number) => request<void>(`/candidates/${id}`, { method: "DELETE" }),
  updateRubric: (id: number, payload: { name: string; criteria: Rubric["criteria"] }) =>
    request<Rubric>(`/rubrics/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteRubric: (id: number) => request<void>(`/rubrics/${id}`, { method: "DELETE" }),

  listCompanies: () => request<Company[]>("/companies"),
  getCompany: (id: number) => request<Company>(`/companies/${id}`),
  createCompany: (payload: CompanyCreatePayload) =>
    request<Company>("/companies", { method: "POST", body: JSON.stringify(payload) }),
  deleteCompany: (id: number) => request<void>(`/companies/${id}`, { method: "DELETE" }),

  listOpportunities: () => request<Opportunity[]>("/opportunities"),
  createOpportunity: (payload: OpportunityCreatePayload) =>
    request<Opportunity>("/opportunities", { method: "POST", body: JSON.stringify(payload) }),
  deleteOpportunity: (id: number) => request<void>(`/opportunities/${id}`, { method: "DELETE" }),
  recomputeUrgency: () => request<{ status: string; updated_opportunities: number }>("/opportunities/recompute-urgency", { method: "POST" }),

  getCommandCenterMatches: (urgency_band?: string) =>
    request<any[]>(`/command-center/matches${urgency_band ? `?urgency_band=${encodeURIComponent(urgency_band)}` : ""}`),

  createTouch: (payload: { entity_type: string; entity_id: number; channel: string; outcome: string; notes?: string }) =>
    request<any>("/touches", { method: "POST", body: JSON.stringify(payload) }),
  listTouches: (entity_type?: string, entity_id?: number) => {
    const params = new URLSearchParams();
    if (entity_type) params.append("entity_type", entity_type);
    if (entity_id) params.append("entity_id", String(entity_id));
    return request<any[]>(`/touches?${params.toString()}`);
  },

  runBatchScreening: async (rubric_id: number, usernames: string[], onProgress: (event: any) => void) => {

    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/screenings/batch`, {
      method: "POST",
      headers,
      body: JSON.stringify({ rubric_id, usernames }),
    });

    if (!res.ok) {
      let errorMessage = `API ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.detail) errorMessage = String(errorData.detail);
      } catch {}
      throw new Error(errorMessage);
    }

    if (!res.body) throw new Error("ReadableStream not supported");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            onProgress(event);
          } catch (e) {
            console.error("Failed to parse batch event:", line, e);
          }
        }
      }
    }
    
    if (buffer.trim()) {
      try {
        onProgress(JSON.parse(buffer));
      } catch (e) {}
    }
  },
};

export interface IntegrationSettingsOut {
  github_token_configured: boolean;
  anthropic_api_key_configured: boolean;
  openai_api_key_configured: boolean;
}
