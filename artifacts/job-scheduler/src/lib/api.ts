// ═══════════════════════════════════════════════════════════
//  TYPED API CLIENT — StudioYield Frontend
//  All fetch() calls go through apiFetch() which:
//  • Attaches Authorization: Bearer <token> headers
//  • Throws a structured ApiError on non-2xx responses
//  • Returns typed JSON directly
// ═══════════════════════════════════════════════════════════

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(
      (body.message as string) ||
        (body.error as string) ||
        `API error ${status}`
    );
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

// Base URL — empty string so Vite proxy handles /api/* forwarding
const BASE = "";

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let body: Record<string, unknown>;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

// ── Auth ─────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  user: { id: number; email: string };
  message: string;
}

export const authApi = {
  register: (email: string, password: string) =>
    apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string, rememberMe: boolean) =>
    apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe }),
    }),
};

// ── Projects ──────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  weight: number;   // deadline_day
  value: number;    // contract_value
  status: "Pending" | "Scheduled" | "Waitlisted";
  scheduled_day: number | null;
}

export const projectsApi = {
  list: (token: string) =>
    apiFetch<{ projects: Project[] }>("/api/projects", {}, token),

  add: (
    token: string,
    payload: { name: string; weight: number; value: number }
  ) =>
    apiFetch<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  remove: (token: string, id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/api/projects/${id}`, {
      method: "DELETE",
    }, token),
};

// ── Schedule ──────────────────────────────────────────────
export interface OptimizeResult {
  accepted: (Project & { fraction: number; takenWeight: number; takenValue: number; scheduledDay: number })[];
  rejected: Project[];
  totalValue: number;
  totalWeight: number;
  decisionLog: DecisionStep[];
  blockedDay: number | null;
  capacity: number;
}

export interface DecisionStep {
  item: { id: string; name: string; weight: number; value: number };
  remainingCapacityBefore: number;
  decision: "pack" | "skip";
  takenWeight: number;
  takenValue: number;
  remainingCapacityAfter: number;
}

export interface CommitResponse {
  message: string;
  historyId: number;
  committedAt: string;
}

export interface HistoryEntry {
  id: number;
  week_capacity: number;
  total_value: number;
  total_weight: number;
  schedule_density: string;
  accepted_json: Project[];
  rejected_json: Project[];
  blocked_day: number | null;
  committed_at: string;
}

export const scheduleApi = {
  optimize: (
    token: string,
    payload: { capacity: number; blockedDay?: number | null }
  ) =>
    apiFetch<OptimizeResult>("/api/schedule/optimize", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  commit: (
    token: string,
    payload: {
      capacity: number;
      totalValue: number;
      totalWeight: number;
      accepted: unknown[];
      rejected: unknown[];
      blockedDay?: number | null;
    }
  ) =>
    apiFetch<CommitResponse>("/api/schedule/commit", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  history: (token: string) =>
    apiFetch<{ history: HistoryEntry[] }>("/api/schedule/history", {}, token),
};

// ── Feedback ──────────────────────────────────────────────
export interface FeedbackResponse {
  message: string;
  feedback: {
    id: number;
    project_id: string;
    star_rating: number;
    note: string | null;
    submitted_at: string;
  };
}

export const feedbackApi = {
  submit: (
    token: string,
    payload: { project_id: string; star_rating: number; note?: string }
  ) =>
    apiFetch<FeedbackResponse>("/api/feedback/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  get: (token: string, projectId: string) =>
    apiFetch<{ feedback: FeedbackResponse["feedback"] | null }>(
      `/api/feedback/${projectId}`,
      {},
      token
    ),
};

// ── Client Projects ───────────────────────────────────────
export interface ClientProject {
  id: number;
  client_name: string;
  contract_value: number;
  delivery_deadline: number;
  optimization_status: "Pending" | "Scheduled" | "Waitlisted";
  created_at: string;
}

export const clientProjectsApi = {
  list: (token: string) =>
    apiFetch<{ projects: ClientProject[] }>("/api/projects/client", {}, token),

  create: (
    token: string,
    payload: {
      client_name: string;
      contract_value: number;
      delivery_deadline: number;
    }
  ) =>
    apiFetch<{ project: ClientProject }>("/api/projects/new", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),
};

export default apiFetch;
