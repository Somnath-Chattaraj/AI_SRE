// ============================================================
// AutoHeal – Real API Client (sre_anomaly backend)
// ============================================================
// Uses credentials: "include" so better-auth session cookies are
// forwarded automatically on every request.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let msg: string;
    try {
      msg = (JSON.parse(text) as { error?: string })?.error || text;
    } catch {
      msg = text;
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────

export interface BackendService {
  id: string;
  name: string;
  url_server: string;
  url_codebase: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceMetrics {
  serviceId: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  uptime: number;      // percentage 0–100
  avgLatency: number;  // ms
  lastChecked: string; // ISO timestamp
  timeSeries: {
    latency: { timestamp: string; value: number }[];
    uptime: { timestamp: string; value: number }[];
  };
}

export interface BackendIncident {
  id: string;
  serviceId: string;
  title: string;
  description?: string;
  type: string;
  severity: string;
  patchStatus: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Services ────────────────────────────────────────────────

/** GET /services */
export async function fetchRealServices(): Promise<BackendService[]> {
  const res = await apiCall<{ services: BackendService[] }>("/services");
  return res.services;
}

/** POST /services */
export async function addRealService(data: {
  name: string;
  url_server: string;
  url_codebase?: string;
}): Promise<BackendService> {
  const res = await apiCall<{ message: string; service: BackendService }>(
    "/services",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return res.service;
}

/** DELETE /services/:id */
export async function deleteRealService(id: string): Promise<void> {
  await apiCall<{ message: string }>(`/services/${id}`, { method: "DELETE" });
}

// ─── Metrics ─────────────────────────────────────────────────

/** GET /services/:id/metrics */
export async function fetchRealMetrics(serviceId: string): Promise<ServiceMetrics> {
  return apiCall<ServiceMetrics>(`/services/${serviceId}/metrics`);
}

// ─── Incidents ───────────────────────────────────────────────

/** GET /incidents?service_id=:id */
export async function fetchRealIncidents(
  serviceId: string,
): Promise<BackendIncident[]> {
  const res = await apiCall<{ incidents: BackendIncident[] }>(
    `/incidents?service_id=${encodeURIComponent(serviceId)}`,
  );
  return res.incidents;
}
