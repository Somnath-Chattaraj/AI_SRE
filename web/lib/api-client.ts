const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  if (!res.ok) {
    const text = await res.text();
    let msg: string;
    try { msg = (JSON.parse(text) as { error?: string })?.error || text; }
    catch { msg = text; }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}



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
  uptime: number;
  avgLatency: number;
  lastChecked: string;
  timeSeries: {
    latency: { timestamp: string; value: number }[];
    uptime: { timestamp: string; value: number }[];
  };
}

export interface BackendIncident {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description?: string;
  type: string;
  severity: string;
  status: "open" | "investigating" | "resolved" | "failed";
  patchStatus: string;
  prUrl?: string;
  aiAnalysis?: string;
  rootCause?: string;
  confidence?: number;
  patches?: { filePath: string; rationale: string }[];
  patchAnalysis?: string;
  patchModel?: string;
  patchedAt?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface AnomalyLog {
  id: string;
  metric: string;
  value: number | null;
  raw_data: {
    probe_success?: [number, number][];
    probe_duration_seconds?: [number, number][];
    probe_http_status_code?: [number, number][];
    probe_http_ssl?: [number, number][];
    probe_http_content_length?: [number, number][];
    stats?: Record<string, number>;
  } | null;
  serviceId: string;
  createdAt: string;
}

export interface AIAction {
  id: string;
  type: "anomaly_detected" | "fix_generated" | "pr_created" | "auto_resolved" | "bug_detected";
  message: string;
  serviceName: string;
  timestamp: string;
}



export async function fetchRealServices(): Promise<BackendService[]> {
  const res = await apiCall<{ services: BackendService[] }>("/services");
  return res.services;
}

export async function addRealService(data: {
  name: string;
  url_server: string;
  url_codebase?: string;
}): Promise<BackendService> {
  const res = await apiCall<{ message: string; service: BackendService }>("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.service;
}

export async function deleteRealService(id: string): Promise<void> {
  await apiCall<{ message: string }>(`/services/${id}`, { method: "DELETE" });
}



export async function fetchRealMetrics(serviceId: string): Promise<ServiceMetrics> {
  return apiCall<ServiceMetrics>(`/services/${serviceId}/metrics`);
}



export async function fetchRealIncidents(serviceId?: string): Promise<BackendIncident[]> {
  const qs = serviceId ? `?service_id=${encodeURIComponent(serviceId)}` : "";
  const res = await apiCall<{ incidents: BackendIncident[] }>(`/incidents${qs}`);
  return res.incidents;
}



export async function fetchRealAIActions(): Promise<AIAction[]> {
  const res = await apiCall<{ actions: AIAction[] }>("/ai-actions");
  return res.actions;
}



export async function fetchAnomalyLogs(serviceId: string): Promise<AnomalyLog[]> {
  const res = await apiCall<{ logs: AnomalyLog[] }>(`/services/${serviceId}/anomaly-logs`);
  return res.logs;
}
