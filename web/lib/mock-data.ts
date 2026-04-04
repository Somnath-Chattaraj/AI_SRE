



export type ServiceStatus = "healthy" | "warning" | "critical" | "unknown";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type PRStatus = "pending" | "merged" | "failed" | "reviewing";

export interface Service {
  id: string;
  name: string;
  endpoint: string;
  status: ServiceStatus;
  uptime: number;
  avgLatency: number;
  errorRate: number;
  lastChecked: string;
  monitoringInterval: number; 
  alertThreshold: number; 
  activeIncidents: number;
  description?: string;
}

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface TimeSeriesData {
  label: string;
  data: MetricPoint[];
  color: string;
}

export interface Incident {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: "open" | "investigating" | "resolved";
  detectedAt: string;
  resolvedAt?: string;
  aiAnalysis?: string;
  rootCause?: string;
  confidence?: number;
}

export interface PullRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  status: PRStatus;
  diffSummary: string;
  diff: string;
  githubUrl: string;
  createdAt: string;
  mergedAt?: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface AIAction {
  id: string;
  type: "bug_detected" | "fix_generated" | "pr_created" | "anomaly_detected" | "auto_resolved";
  message: string;
  timestamp: string;
  serviceId: string;
  serviceName: string;
  severity?: IncidentSeverity;
}

export interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  serviceId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source: string;
  serviceId: string;
}


function generateTimeSeries(
  hours: number,
  baseValue: number,
  variance: number,
  spikes: number[] = [],
): MetricPoint[] {
  const points: MetricPoint[] = [];
  const now = new Date();
  for (let i = hours * 60; i >= 0; i -= 5) {
    const ts = new Date(now.getTime() - i * 60 * 1000);
    let val =
      baseValue + (Math.random() - 0.5) * variance * 2;
    if (spikes.some((s) => Math.abs(i - s) < 10)) {
      val += variance * 3;
    }
    points.push({
      timestamp: ts.toISOString(),
      value: Math.max(0, Math.round(val * 100) / 100),
    });
  }
  return points;
}


export const services: Service[] = [
  {
    id: "svc-1",
    name: "Auth-Gateway-V2",
    endpoint: "https://api.opsmith.io/auth",
    status: "healthy",
    uptime: 99.982,
    avgLatency: 42,
    errorRate: 0.04,
    lastChecked: new Date(Date.now() - 30000).toISOString(),
    monitoringInterval: 30,
    alertThreshold: 200,
    activeIncidents: 0,
    description: "Primary authentication gateway handling OAuth flows, JWT validation, and session management.",
  },
  {
    id: "svc-2",
    name: "Payment-API",
    endpoint: "https://api.opsmith.io/payments",
    status: "critical",
    uptime: 98.2,
    avgLatency: 342,
    errorRate: 4.7,
    lastChecked: new Date(Date.now() - 15000).toISOString(),
    monitoringInterval: 15,
    alertThreshold: 150,
    activeIncidents: 2,
    description: "Handles payment processing, Stripe integration, and billing webhooks.",
  },
  {
    id: "svc-3",
    name: "Postgres-Main-Replica",
    endpoint: "https://db-monitor.opsmith.io/pg-main",
    status: "warning",
    uptime: 99.7,
    avgLatency: 89,
    errorRate: 0.8,
    lastChecked: new Date(Date.now() - 45000).toISOString(),
    monitoringInterval: 60,
    alertThreshold: 100,
    activeIncidents: 1,
    description: "PostgreSQL primary replica health monitor with replication lag tracking.",
  },
  {
    id: "svc-4",
    name: "Image-Processing-Node",
    endpoint: "https://api.opsmith.io/images",
    status: "healthy",
    uptime: 99.95,
    avgLatency: 156,
    errorRate: 0.12,
    lastChecked: new Date(Date.now() - 20000).toISOString(),
    monitoringInterval: 30,
    alertThreshold: 300,
    activeIncidents: 0,
    description: "Image resizing, compression, and CDN distribution pipeline.",
  },
  {
    id: "svc-5",
    name: "Billing-Service-Internal",
    endpoint: "https://internal.opsmith.io/billing",
    status: "healthy",
    uptime: 99.99,
    avgLatency: 28,
    errorRate: 0.01,
    lastChecked: new Date(Date.now() - 60000).toISOString(),
    monitoringInterval: 120,
    alertThreshold: 100,
    activeIncidents: 0,
    description: "Internal billing aggregation and invoice generation service.",
  },
  {
    id: "svc-6",
    name: "Email-Relay-SaaS",
    endpoint: "https://api.opsmith.io/email",
    status: "warning",
    uptime: 99.4,
    avgLatency: 210,
    errorRate: 1.2,
    lastChecked: new Date(Date.now() - 10000).toISOString(),
    monitoringInterval: 30,
    alertThreshold: 250,
    activeIncidents: 1,
    description: "Transactional email delivery via SendGrid and Postmark with fallback routing.",
  },
];


export const latencyTimeSeries: TimeSeriesData[] = [
  { label: "Auth-Gateway", data: generateTimeSeries(24, 42, 15), color: "#8b5cf6" },
  { label: "Payment-API", data: generateTimeSeries(24, 340, 120, [200, 400, 600]), color: "#ef4444" },
  { label: "Postgres-Main", data: generateTimeSeries(24, 89, 30, [300]), color: "#f59e0b" },
];

export const errorRateTimeSeries: TimeSeriesData[] = [
  { label: "Auth-Gateway", data: generateTimeSeries(24, 0.04, 0.02), color: "#8b5cf6" },
  { label: "Payment-API", data: generateTimeSeries(24, 4.7, 2.5, [200, 400]), color: "#ef4444" },
  { label: "Postgres-Main", data: generateTimeSeries(24, 0.8, 0.4, [300]), color: "#f59e0b" },
];

export const successRateTimeSeries: TimeSeriesData[] = [
  { label: "Auth-Gateway", data: generateTimeSeries(24, 99.96, 0.02), color: "#22c55e" },
  { label: "Payment-API", data: generateTimeSeries(24, 95.3, 3, [200, 400]), color: "#ef4444" },
  { label: "Postgres-Main", data: generateTimeSeries(24, 99.2, 0.5), color: "#f59e0b" },
];


export const aiActions: AIAction[] = [
  {
    id: "act-1",
    type: "bug_detected",
    message: "Memory leak detected in Payment-API connection pool",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    serviceId: "svc-2",
    serviceName: "Payment-API",
    severity: "critical",
  },
  {
    id: "act-2",
    type: "pr_created",
    message: "PR #42 created — fix connection pool exhaustion",
    timestamp: new Date(Date.now() - 240000).toISOString(),
    serviceId: "svc-2",
    serviceName: "Payment-API",
  },
  {
    id: "act-3",
    type: "anomaly_detected",
    message: "Unusual replication lag spike on Postgres-Main-Replica",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    serviceId: "svc-3",
    serviceName: "Postgres-Main-Replica",
    severity: "medium",
  },
  {
    id: "act-4",
    type: "fix_generated",
    message: "Auto-generated index optimization for slow query pattern",
    timestamp: new Date(Date.now() - 900000).toISOString(),
    serviceId: "svc-3",
    serviceName: "Postgres-Main-Replica",
  },
  {
    id: "act-5",
    type: "auto_resolved",
    message: "Email-Relay-SaaS rate limit auto-adjusted",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    serviceId: "svc-6",
    serviceName: "Email-Relay-SaaS",
  },
  {
    id: "act-6",
    type: "bug_detected",
    message: "SSL certificate expiring in 7 days on Auth-Gateway-V2",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    serviceId: "svc-1",
    serviceName: "Auth-Gateway-V2",
    severity: "low",
  },
];


export const incidents: Incident[] = [
  {
    id: "inc-1",
    serviceId: "svc-2",
    serviceName: "Payment-API",
    title: "Connection pool exhaustion causing 5xx errors",
    description: "The Payment-API service is experiencing connection pool exhaustion, causing intermittent 502 and 503 errors for approximately 4.7% of requests.",
    severity: "critical",
    status: "investigating",
    detectedAt: new Date(Date.now() - 300000).toISOString(),
    aiAnalysis:
      "Analysis indicates the root cause is a connection leak in the Stripe webhook handler. When a webhook payload fails validation, the database connection is not properly released back to the pool. Under high webhook volume (currently ~2,400/min), this causes pool exhaustion within 15-20 minutes.",
    rootCause: "Connection leak in stripe-webhook-handler.ts:L142 — missing connection.release() in the catch block of processWebhookPayload().",
    confidence: 94,
  },
  {
    id: "inc-2",
    serviceId: "svc-2",
    serviceName: "Payment-API",
    title: "Elevated latency on /checkout endpoint",
    description: "Average response time for /checkout has increased from 120ms to 342ms over the past 2 hours.",
    severity: "high",
    status: "open",
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
    aiAnalysis:
      "The latency increase correlates with the connection pool issue (INC-1). As available connections decrease, requests queue for longer periods. Secondary factor: a recent deployment added an unoptimized N+1 query in the cart validation middleware.",
    rootCause: "N+1 query in cart-validation.ts:L89 combined with connection pool pressure.",
    confidence: 87,
  },
  {
    id: "inc-3",
    serviceId: "svc-3",
    serviceName: "Postgres-Main-Replica",
    title: "Replication lag exceeding threshold",
    description: "Replication lag between primary and replica has exceeded the 500ms threshold, peaking at 2.3 seconds.",
    severity: "medium",
    status: "investigating",
    detectedAt: new Date(Date.now() - 600000).toISOString(),
    aiAnalysis:
      "Replication lag is caused by a long-running analytical query on the replica that is holding a lock. The query originates from the reporting dashboard's daily aggregation job, which was not configured with a statement timeout.",
    rootCause: "Missing statement_timeout on reporting aggregation query in analytics-cron.ts:L56.",
    confidence: 91,
  },
  {
    id: "inc-4",
    serviceId: "svc-6",
    serviceName: "Email-Relay-SaaS",
    title: "SendGrid rate limit warnings",
    description: "Approaching SendGrid API rate limit. Current throughput: 450/min (limit: 500/min).",
    severity: "low",
    status: "resolved",
    detectedAt: new Date(Date.now() - 1200000).toISOString(),
    resolvedAt: new Date(Date.now() - 600000).toISOString(),
    aiAnalysis:
      "Rate limit approach was caused by a marketing campaign triggering bulk email sends during peak transactional email hours. OpSmith automatically adjusted the queue concurrency and enabled Postmark fallback routing.",
    rootCause: "Concurrent marketing + transactional email volume exceeding single-provider capacity.",
    confidence: 98,
  },
];


export const pullRequests: PullRequest[] = [
  {
    id: "pr-42",
    serviceId: "svc-2",
    serviceName: "Payment-API",
    title: "Fix connection pool leak in Stripe webhook handler",
    description: "Adds proper connection release in the catch block of processWebhookPayload() to prevent connection pool exhaustion under failed webhook validation scenarios.",
    status: "pending",
    diffSummary: "Added try/finally block to ensure connection release; added connection pool monitoring metrics.",
    diff: `--- a/src/handlers/stripe-webhook-handler.ts
+++ b/src/handlers/stripe-webhook-handler.ts
@@ -138,12 +138,16 @@ export async function processWebhookPayload(
   const connection = await pool.acquire();
   try {
     const validated = validatePayload(payload);
-    if (!validated) {
-      logger.warn('Invalid webhook payload', { id: payload.id });
-      return { success: false, error: 'validation_failed' };
-    }
-    await connection.query(INSERT_WEBHOOK, [validated]);
-    return { success: true };
+    if (!validated) {
+      logger.warn('Invalid webhook payload', { id: payload.id });
+      return { success: false, error: 'validation_failed' };
+    }
+    await connection.query(INSERT_WEBHOOK, [validated]);
+    return { success: true };
   } catch (error) {
     logger.error('Webhook processing failed', { error });
-    throw error;
+    return { success: false, error: 'processing_failed' };
+  } finally {
+    // Always release the connection back to the pool
+    connection.release();
+    metrics.poolActiveConnections.dec();
   }
 }`,
    githubUrl: "https://github.com/opsmith/payment-api/pull/42",
    createdAt: new Date(Date.now() - 240000).toISOString(),
    filesChanged: 3,
    additions: 12,
    deletions: 6,
  },
  {
    id: "pr-41",
    serviceId: "svc-3",
    serviceName: "Postgres-Main-Replica",
    title: "Add statement timeout for analytics queries",
    description: "Configures a 30-second statement timeout for all analytical queries running on the replica to prevent replication lag from long-running operations.",
    status: "merged",
    diffSummary: "Added SET statement_timeout before analytical queries; added query duration logging.",
    diff: `--- a/src/jobs/analytics-cron.ts
+++ b/src/jobs/analytics-cron.ts
@@ -52,8 +52,12 @@ export async function runDailyAggregation() {
   const client = await replicaPool.connect();
   try {
+    // Prevent long-running queries from causing replication lag
+    await client.query("SET statement_timeout = '30s'");
+    const startTime = Date.now();
     const result = await client.query(AGGREGATION_QUERY);
-    await saveAggregation(result.rows);
+    const duration = Date.now() - startTime;
+    logger.info('Aggregation completed', { duration, rows: result.rowCount });
+    await saveAggregation(result.rows);
   } finally {
     client.release();
   }`,
    githubUrl: "https://github.com/opsmith/postgres-monitor/pull/41",
    createdAt: new Date(Date.now() - 900000).toISOString(),
    mergedAt: new Date(Date.now() - 600000).toISOString(),
    filesChanged: 2,
    additions: 8,
    deletions: 2,
  },
  {
    id: "pr-40",
    serviceId: "svc-6",
    serviceName: "Email-Relay-SaaS",
    title: "Implement automatic provider fallback routing",
    description: "Adds intelligent fallback from SendGrid to Postmark when rate limits are approached, with automatic queue concurrency adjustment.",
    status: "merged",
    diffSummary: "Added rate limit monitoring; implemented provider fallback; added concurrency auto-tuning.",
    diff: `--- a/src/providers/email-router.ts
+++ b/src/providers/email-router.ts
@@ -18,6 +18,22 @@ export class EmailRouter {
+  private async checkRateLimit(provider: string): Promise<boolean> {
+    const usage = await this.rateLimiter.getCurrentUsage(provider);
+    const limit = this.config.providers[provider].rateLimit;
+    return usage / limit > 0.85; // 85% threshold
+  }
+
+  async route(email: EmailPayload): Promise<SendResult> {
+    const primaryNearLimit = await this.checkRateLimit('sendgrid');
+    
+    if (primaryNearLimit) {
+      logger.warn('Primary provider near rate limit, routing to fallback');
+      metrics.fallbackRouting.inc();
+      return this.send('postmark', email);
+    }
+    
+    return this.send('sendgrid', email);
+  }
 }`,
    githubUrl: "https://github.com/opsmith/email-relay/pull/40",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    mergedAt: new Date(Date.now() - 1200000).toISOString(),
    filesChanged: 5,
    additions: 45,
    deletions: 12,
  },
  {
    id: "pr-39",
    serviceId: "svc-2",
    serviceName: "Payment-API",
    title: "Optimize N+1 query in cart validation",
    description: "Replaces individual item lookups with a batch query in cart validation middleware to reduce database round-trips.",
    status: "reviewing",
    diffSummary: "Replaced N+1 query pattern with batch IN clause; added query result caching.",
    diff: `--- a/src/middleware/cart-validation.ts
+++ b/src/middleware/cart-validation.ts
@@ -85,10 +85,14 @@ export async function validateCart(cart: Cart) {
-  for (const item of cart.items) {
-    const product = await db.query('SELECT * FROM products WHERE id = $1', [item.productId]);
-    if (!product.rows[0]) throw new ValidationError('product_not_found');
-    validated.push({ ...item, price: product.rows[0].price });
-  }
+  const productIds = cart.items.map(i => i.productId);
+  const products = await db.query(
+    'SELECT * FROM products WHERE id = ANY($1)',
+    [productIds]
+  );
+  const productMap = new Map(products.rows.map(p => [p.id, p]));
+  for (const item of cart.items) {
+    const product = productMap.get(item.productId);
+    if (!product) throw new ValidationError('product_not_found');
+    validated.push({ ...item, price: product.price });
+  }
   return validated;
 }`,
    githubUrl: "https://github.com/opsmith/payment-api/pull/39",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    filesChanged: 1,
    additions: 10,
    deletions: 5,
  },
];


export const notifications: Notification[] = [
  {
    id: "notif-1",
    type: "error",
    title: "Critical: Payment-API",
    message: "Connection pool exhaustion detected. Error rate at 4.7%.",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    read: false,
    serviceId: "svc-2",
  },
  {
    id: "notif-2",
    type: "success",
    title: "PR #42 Created",
    message: "OpSmith generated a fix for the connection pool leak.",
    timestamp: new Date(Date.now() - 240000).toISOString(),
    read: false,
    serviceId: "svc-2",
  },
  {
    id: "notif-3",
    type: "warning",
    title: "Replication Lag Warning",
    message: "Postgres-Main-Replica lag exceeding 500ms threshold.",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    read: true,
    serviceId: "svc-3",
  },
  {
    id: "notif-4",
    type: "success",
    title: "PR #41 Merged",
    message: "Statement timeout fix merged for analytics queries.",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    read: true,
    serviceId: "svc-3",
  },
  {
    id: "notif-5",
    type: "info",
    title: "Auto-Resolved",
    message: "Email-Relay rate limit issue auto-resolved via provider fallback.",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    read: true,
    serviceId: "svc-6",
  },
];


export function generateLogs(serviceId: string): LogEntry[] {
  const levels: LogEntry["level"][] = ["info", "warn", "error", "debug"];
  const messages: Record<string, string[]> = {
    "svc-1": [
      "JWT token validated successfully",
      "OAuth callback processed for user #4821",
      "Session refresh completed",
      "Rate limit check passed",
      "CORS preflight handled",
    ],
    "svc-2": [
      "Payment intent created: pi_3MqK2l...",
      "Stripe webhook received: evt_1N7...",
      "Connection pool: 45/50 active",
      "ERROR: Connection pool exhausted — request queued",
      "Checkout session timeout after 30s",
      "Refund processed: re_3MqK...",
      "WARNING: Webhook payload validation failed",
    ],
    "svc-3": [
      "Replication lag: 234ms",
      "Query duration: 1.2s (aggregation)",
      "Vacuum completed on orders table",
      "WARNING: Replication lag exceeding threshold: 2.3s",
      "Connection count: 12/100",
      "Checkpoint completed",
    ],
    "svc-4": [
      "Image resized: 1920x1080 → 480x270",
      "CDN cache invalidated for /assets/hero",
      "WebP conversion completed: 340KB → 89KB",
      "Batch processing: 42 images queued",
    ],
    "svc-5": [
      "Invoice generated: INV-2024-0891",
      "Billing aggregation completed",
      "Subscription renewed for org #312",
      "Usage metrics synced",
    ],
    "svc-6": [
      "Email dispatched via SendGrid: msg_abc123",
      "WARNING: Approaching SendGrid rate limit (450/500)",
      "Fallback routing activated: Postmark",
      "Queue concurrency adjusted: 10 → 6",
      "Template rendered: password-reset",
    ],
  };

  const serviceMsgs = messages[serviceId] || messages["svc-1"];
  const logs: LogEntry[] = [];
  for (let i = 0; i < 30; i++) {
    const msg = serviceMsgs[Math.floor(Math.random() * serviceMsgs.length)];
    const level = msg.startsWith("ERROR")
      ? "error"
      : msg.startsWith("WARNING")
        ? "warn"
        : levels[Math.floor(Math.random() * 3)]; 
    logs.push({
      id: `log-${serviceId}-${i}`,
      timestamp: new Date(Date.now() - i * 120000 + Math.random() * 60000).toISOString(),
      level,
      message: msg,
      source: `${serviceId}-worker`,
      serviceId,
    });
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
