# AutoHeal Frontend API Documentation

## Overview

The AutoHeal frontend uses a **mock API layer** (`lib/mock-api.ts`) that simulates backend calls with realistic network delays (200-600ms). All functions return Promises and can be swapped with real API calls when the backend is ready.

## Base Configuration

```typescript
// Mock API simulates network latency
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
const randomDelay = () => delay(200 + Math.random() * 400);
```

**Base URL (when connecting to real backend):** `https://api.autoheal.io/v1`

---

## Authentication API

### `POST /auth/signin` → `signIn(email, password)`

Signs in a user with email and password credentials.

```typescript
import { signIn } from "@/lib/mock-api";

const { user, token } = await signIn("user@company.com", "password");
// Returns: { user: User, token: string }
```

**Request Body:**
| Field    | Type   | Required | Description       |
|----------|--------|----------|-------------------|
| email    | string | Yes      | User email        |
| password | string | Yes      | User password     |

**Response:**
```json
{
  "user": {
    "id": "usr-1",
    "name": "Alex Chen",
    "email": "user@company.com",
    "role": "admin"
  },
  "token": "mock-jwt-token-1712345678"
}
```

**Error Cases:**
- `email === "error@test.com"` → throws `"Invalid credentials"`

---

### `POST /auth/signup` → `signUp(name, email, password)`

Creates a new user account.

```typescript
import { signUp } from "@/lib/mock-api";

const { user, token } = await signUp("Alex Chen", "alex@company.com", "pass");
```

**Error Cases:**
- `email === "exists@test.com"` → throws `"Email already exists"`

---

## Services API

### `GET /services` → `fetchServices()`

Returns all monitored services.

```typescript
import { fetchServices } from "@/lib/mock-api";

const services: Service[] = await fetchServices();
```

**Response Shape:**
```typescript
interface Service {
  id: string;                  // e.g. "svc-1"
  name: string;                // e.g. "Auth-Gateway-V2"
  endpoint: string;            // e.g. "https://api.autoheal.io/auth"
  status: "healthy" | "warning" | "critical" | "unknown";
  uptime: number;              // e.g. 99.982
  avgLatency: number;          // ms, e.g. 42
  errorRate: number;           // %, e.g. 0.04
  lastChecked: string;         // ISO 8601 timestamp
  monitoringInterval: number;  // seconds
  alertThreshold: number;      // ms
  activeIncidents: number;
  description?: string;
}
```

---

### `GET /services/:id` → `fetchService(id)`

Returns a single service by ID.

```typescript
const service = await fetchService("svc-2");
```

---

### `POST /services` → `createService(data)`

Creates a new service to monitor.

```typescript
const newService = await createService({
  name: "New-API",
  endpoint: "https://api.example.com/health",
  monitoringInterval: 30,
  alertThreshold: 200,
});
```

---

### `PATCH /services/:id` → `updateService(id, data)`

Updates a service's configuration.

```typescript
const updated = await updateService("svc-1", { alertThreshold: 300 });
```

---

### `DELETE /services/:id` → `deleteService(id)`

Removes a service from monitoring.

```typescript
const success: boolean = await deleteService("svc-1");
```

---

## Metrics API

### `GET /metrics/latency` → `fetchLatencyTimeSeries()`

Returns latency time-series data for all services (24h).

```typescript
const data: TimeSeriesData[] = await fetchLatencyTimeSeries();
```

**Response Shape:**
```typescript
interface TimeSeriesData {
  label: string;           // Service name
  data: MetricPoint[];     // Array of { timestamp, value }
  color: string;           // Chart color
}

interface MetricPoint {
  timestamp: string;       // ISO 8601
  value: number;
}
```

---

### `GET /metrics/error-rate` → `fetchErrorRateTimeSeries()`

Returns error rate time-series data.

---

### `GET /metrics/success-rate` → `fetchSuccessRateTimeSeries()`

Returns success rate time-series data.

---

### `GET /metrics/service/:id` → `fetchServiceMetrics(serviceId)`

Returns all three metric types for a specific service.

```typescript
const metrics = await fetchServiceMetrics("svc-2");
// Returns: { latency: TimeSeriesData, errorRate: TimeSeriesData, successRate: TimeSeriesData }
```

---

## Dashboard API

### `GET /dashboard/stats` → `fetchDashboardStats()`

Returns aggregated dashboard statistics.

```typescript
interface DashboardStats {
  totalServices: number;
  avgUptime: number;
  avgLatency: number;
  avgErrorRate: number;
  activeIncidents: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}
```

---

## Incidents API

### `GET /incidents` → `fetchIncidents()`

Returns all incidents across all services.

```typescript
interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  detectedAt: string;
  resolvedAt?: string;
  aiAnalysis?: string;       // AI explanation in plain English
  rootCause?: string;        // Specific code location
  confidence?: number;       // AI confidence 0-100
}
```

---

### `GET /incidents/service/:id` → `fetchIncidentsByService(serviceId)`

Returns incidents for a specific service.

---

## Pull Requests API

### `GET /pull-requests` → `fetchPullRequests()`

Returns all AI-generated pull requests.

```typescript
interface PullRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  status: "pending" | "merged" | "failed" | "reviewing";
  diffSummary: string;
  diff: string;              // Full unified diff
  githubUrl: string;
  createdAt: string;
  mergedAt?: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}
```

---

### `GET /pull-requests/service/:id` → `fetchPullRequestsByService(serviceId)`

Returns pull requests for a specific service.

---

## AI Actions API

### `GET /ai/actions` → `fetchAIActions()`

Returns recent AI-automated actions.

```typescript
interface AIAction {
  id: string;
  type: "bug_detected" | "fix_generated" | "pr_created" | "anomaly_detected" | "auto_resolved";
  message: string;
  timestamp: string;
  serviceId: string;
  serviceName: string;
  severity?: "low" | "medium" | "high" | "critical";
}
```

---

## Notifications API

### `GET /notifications` → `fetchNotifications()`

Returns all notifications.

```typescript
interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  serviceId?: string;
}
```

---

### `PATCH /notifications/:id/read` → `markNotificationRead(id)`

Marks a single notification as read.

---

### `PATCH /notifications/read-all` → `markAllNotificationsRead()`

Marks all notifications as read.

---

## Logs API

### `GET /services/:id/logs` → `fetchServiceLogs(serviceId)`

Returns probe/log entries for a service.

```typescript
interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source: string;
  serviceId: string;
}
```

---

## State Management

The app uses **Zustand** for global state:

```typescript
import { useAppStore } from "@/lib/store";

// Auth
const { user, isAuthenticated, setAuth, logout } = useAppStore();

// UI
const { sidebarCollapsed, toggleSidebar } = useAppStore();
const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();

// Notifications
const { unreadCount, setUnreadCount } = useAppStore();
```

---

## Connecting to a Real Backend

To switch from mock to real API:

1. **Create an API client** in `lib/api-client.ts`:
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.autoheal.io/v1";

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAppStore.getState().token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

2. **Replace mock functions** in `lib/mock-api.ts` with real API calls:
```typescript
export async function fetchServices(): Promise<Service[]> {
  return apiCall<Service[]>("/services");
}
```

3. **Add WebSocket** for real-time notifications:
```typescript
const ws = new WebSocket("wss://api.autoheal.io/ws");
ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Update store
};
```
