



import {
  services as mockServices,
  incidents as mockIncidents,
  pullRequests as mockPRs,
  aiActions as mockAIActions,
  notifications as mockNotifications,
  latencyTimeSeries,
  errorRateTimeSeries,
  successRateTimeSeries,
  generateLogs,
  type Service,
  type Incident,
  type PullRequest,
  type AIAction,
  type Notification,
  type TimeSeriesData,
  type LogEntry,
} from "./mock-data"


const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))
const randomDelay = () => delay(200 + Math.random() * 400)


let _services = [...mockServices]

export async function fetchServices(): Promise<Service[]> {
  await randomDelay()
  return _services
}

export async function fetchService(id: string): Promise<Service | undefined> {
  await randomDelay()
  return _services.find((s) => s.id === id)
}

export async function createService(
  data: Omit<
    Service,
    | "id"
    | "status"
    | "uptime"
    | "avgLatency"
    | "errorRate"
    | "lastChecked"
    | "activeIncidents"
  >
): Promise<Service> {
  await randomDelay()
  const svc: Service = {
    ...data,
    id: `svc-${Date.now()}`,
    status: "unknown",
    uptime: 100,
    avgLatency: 0,
    errorRate: 0,
    lastChecked: new Date().toISOString(),
    activeIncidents: 0,
  }
  _services = [..._services, svc]
  return svc
}

export async function updateService(
  id: string,
  data: Partial<Service>
): Promise<Service | undefined> {
  await randomDelay()
  const idx = _services.findIndex((s) => s.id === id)
  if (idx === -1) return undefined
  _services[idx] = { ..._services[idx], ...data }
  return _services[idx]
}

export async function deleteService(id: string): Promise<boolean> {
  await randomDelay()
  const len = _services.length
  _services = _services.filter((s) => s.id !== id)
  return _services.length < len
}


export async function fetchLatencyTimeSeries(): Promise<TimeSeriesData[]> {
  await randomDelay()
  return latencyTimeSeries
}

export async function fetchErrorRateTimeSeries(): Promise<TimeSeriesData[]> {
  await randomDelay()
  return errorRateTimeSeries
}

export async function fetchSuccessRateTimeSeries(): Promise<TimeSeriesData[]> {
  await randomDelay()
  return successRateTimeSeries
}

export async function fetchServiceMetrics(serviceId: string): Promise<{
  latency: TimeSeriesData
  errorRate: TimeSeriesData
  successRate: TimeSeriesData
}> {
  await randomDelay()
  const idx = _services.findIndex((s) => s.id === serviceId)
  const color = [
    "#8b5cf6",
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#06b6d4",
    "#ec4899",
  ][idx % 6]
  const svc = _services.find((s) => s.id === serviceId)
  const name = svc?.name || "Unknown"

  return {
    latency: {
      label: name,
      data: latencyTimeSeries[idx % latencyTimeSeries.length].data,
      color,
    },
    errorRate: {
      label: name,
      data: errorRateTimeSeries[idx % errorRateTimeSeries.length].data,
      color,
    },
    successRate: {
      label: name,
      data: successRateTimeSeries[idx % successRateTimeSeries.length].data,
      color,
    },
  }
}


export async function fetchIncidents(): Promise<Incident[]> {
  await randomDelay()
  return mockIncidents
}

export async function fetchIncidentsByService(
  serviceId: string
): Promise<Incident[]> {
  await randomDelay()
  return mockIncidents.filter((i) => i.serviceId === serviceId)
}


export async function fetchPullRequests(): Promise<PullRequest[]> {
  await randomDelay()
  return mockPRs
}

export async function fetchPullRequestsByService(
  serviceId: string
): Promise<PullRequest[]> {
  await randomDelay()
  return mockPRs.filter((pr) => pr.serviceId === serviceId)
}


export async function fetchAIActions(): Promise<AIAction[]> {
  await randomDelay()
  return mockAIActions
}


let _notifications = [...mockNotifications]

export async function fetchNotifications(): Promise<Notification[]> {
  await randomDelay()
  return _notifications
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay(100)
  _notifications = _notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  )
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(100)
  _notifications = _notifications.map((n) => ({ ...n, read: true }))
}


export async function fetchServiceLogs(serviceId: string): Promise<LogEntry[]> {
  await randomDelay()
  return generateLogs(serviceId)
}


export interface DashboardStats {
  totalServices: number
  avgUptime: number
  avgLatency: number
  avgErrorRate: number
  activeIncidents: number
  healthyCount: number
  warningCount: number
  criticalCount: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await randomDelay()
  const svcs = _services
  return {
    totalServices: svcs.length,
    avgUptime:
      Math.round(
        (svcs.reduce((a, s) => a + s.uptime, 0) / svcs.length) * 1000
      ) / 1000,
    avgLatency: Math.round(
      svcs.reduce((a, s) => a + s.avgLatency, 0) / svcs.length
    ),
    avgErrorRate:
      Math.round(
        (svcs.reduce((a, s) => a + s.errorRate, 0) / svcs.length) * 100
      ) / 100,
    activeIncidents: svcs.reduce((a, s) => a + s.activeIncidents, 0),
    healthyCount: svcs.filter((s) => s.status === "healthy").length,
    warningCount: svcs.filter((s) => s.status === "warning").length,
    criticalCount: svcs.filter((s) => s.status === "critical").length,
  }
}


export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: "admin" | "viewer"
}

export async function signIn(
  email: string,
  _password: string
): Promise<{ user: User; token: string }> {
  await delay(800)
  if (email === "error@test.com") {
    throw new Error("Invalid credentials")
  }
  return {
    user: {
      id: "usr-1",
      name: "Alex Chen",
      email,
      role: "admin",
    },
    token: "mock-jwt-token-" + Date.now(),
  }
}

export async function signUp(
  name: string,
  email: string,
  _password: string
): Promise<{ user: User; token: string }> {
  await delay(1000)
  if (email === "exists@test.com") {
    throw new Error("Email already exists")
  }
  return {
    user: {
      id: "usr-" + Date.now(),
      name,
      email,
      role: "admin",
    },
    token: "mock-jwt-token-" + Date.now(),
  }
}
