import { promises as fs } from "node:fs";
import prisma from "../../lib/db";
import * as path from "node:path";

// Allow configuring the targets path for local VS containerized dev
const TARGETS_FILE = process.env.PROMETHEUS_TARGETS_FILE || "/etc/prometheus/targets.json";
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

/**
 * Generates the targets.json file required for the Prometheus File SD config.
 */
export async function generateTargetsFile() {
  try {
    const services = await prisma.service.findMany();
    
    const targets = services.map(service => ({
      targets: [`${service.url_server.replace(/\/$/, '')}/health`],
      labels: {
        user_id: service.userId,
        service_id: service.id,
      }
    }));

    // Ensure directory exists if we are running locally inside a custom temp path
    const dir = path.dirname(TARGETS_FILE);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(TARGETS_FILE, JSON.stringify(targets, null, 2));
    console.log(`[Prometheus] Successfully generated ${TARGETS_FILE} with ${targets.length} targets.`);
  } catch (err: any) {
    console.error(`[Prometheus] Failed to generate targets.json: ${err.message}`);
  }
}

/**
 * Triggers a config reload in Prometheus by hitting the /-/reload webhook.
 * Automatically retries exactly once if the first attempt fails.
 */
export async function reloadPrometheus() {
  try {
    const response = await fetch(`${PROMETHEUS_URL}/-/reload`, { method: "POST" });
    if (!response.ok) {
      throw new Error(`Prometheus reload returned status ${response.status}`);
    }
    console.log("[Prometheus] Reloaded successfully.");
  } catch (err: any) {
    console.error(`[Prometheus] Failed to reload. Retrying once... Error: ${err.message}`);
    try {
      // Retry once
      const retryResponse = await fetch(`${PROMETHEUS_URL}/-/reload`, { method: "POST" });
      if (!retryResponse.ok) {
        throw new Error(`Retry returned status ${retryResponse.status}`);
      }
      console.log("[Prometheus] Successfully reloaded on retry.");
    } catch (retryErr: any) {
      console.error(`[Prometheus] Retry to reload Prometheus also failed: ${retryErr.message}`);
    }
  }
}

/**
 * Master hook to synchronously rebuild configuration and notify Prometheus.
 */
export async function updatePrometheusTargets() {
  await generateTargetsFile();
  await reloadPrometheus();
}

export interface PrometheusResult {
  metric: Record<string, string>;
  values: [number, string][]; // [timestamp, value]
}

export interface PrometheusQueryResponse {
  status: string;
  data: {
    resultType: string;
    result: PrometheusResult[];
  };
}

export async function fetchPrometheusMetrics(
  serviceId: string,
  metricName: 'probe_duration_seconds' | 'probe_success',
  windowSeconds = 600,  // default: 10-minute window for anomaly detection
  stepSeconds = 15,     // default: 15 s step
): Promise<[number, number][]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - windowSeconds;
  const step = stepSeconds;

  const query = `${metricName}{service_id="${serviceId}"}`;
  const url = new URL(`${PROMETHEUS_URL}/api/v1/query_range`);
  url.searchParams.append('query', query);
  url.searchParams.append('start', start.toString());
  url.searchParams.append('end', end.toString());
  url.searchParams.append('step', step.toString());

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Prometheus responded with status ${response.status}`);
    }

    const data = (await response.json()) as PrometheusQueryResponse;
    if (data.status !== 'success') {
      throw new Error('Prometheus query failed');
    }

    if (!data.data.result || data.data.result.length === 0) {
      return [];
    }

    const rawValues = data.data?.result?.[0]?.values || [];
    return rawValues.map(([ts, val]) => [ts, parseFloat(val)] as [number, number]);
  } catch (error) {
    console.error(`[Prometheus] Error fetching ${metricName} for service ${serviceId}:`, error);
    return [];
  }
}
