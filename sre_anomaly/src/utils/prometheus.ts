import { promises as fs } from "node:fs";
import prisma from "../../lib/db";
import * as path from "node:path";

const TARGETS_FILE =
  process.env.PROMETHEUS_TARGETS_FILE || "/etc/prometheus/targets/targets.json";
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://prometheus:9090";

/**
 * Generates the targets.json file required for the Prometheus File SD config.
 */
export async function generateTargetsFile() {
  try {
    const services = await prisma.service.findMany();

    const targets = services.map((service) => ({
      targets: [`${service.url_server.replace(/\/$/, "")}/health`],
      labels: {
        user_id: service.userId,
        service_id: service.id,
      },
    }));

    const dir = path.dirname(TARGETS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(TARGETS_FILE, JSON.stringify(targets, null, 2));
    console.log(
      `[Prometheus] Generated ${TARGETS_FILE} with ${targets.length} targets.`,
    );
  } catch (err: any) {
    console.error(
      `[Prometheus] Failed to generate targets.json: ${err.message}`,
    );
  }
}

export async function reloadPrometheus() {
  try {
    const response = await fetch(`${PROMETHEUS_URL}/-/reload`, {
      method: "POST",
    });
    if (!response.ok)
      throw new Error(`Prometheus reload returned status ${response.status}`);
    console.log("[Prometheus] Reloaded successfully.");
  } catch (err: any) {
    console.error(
      `[Prometheus] Failed to reload. Retrying once... Error: ${err.message}`,
    );
    try {
      const retryResponse = await fetch(`${PROMETHEUS_URL}/-/reload`, {
        method: "POST",
      });
      if (!retryResponse.ok)
        throw new Error(`Retry returned status ${retryResponse.status}`);
      console.log("[Prometheus] Successfully reloaded on retry.");
    } catch (retryErr: any) {
      console.error(`[Prometheus] Retry also failed: ${retryErr.message}`);
    }
  }
}

export async function updatePrometheusTargets() {
  await generateTargetsFile();
  await reloadPrometheus();
}

export interface PrometheusResult {
  metric: Record<string, string>;
  values: [number, string][];
}

export interface PrometheusQueryResponse {
  status: string;
  data: { resultType: string; result: PrometheusResult[] };
}

export async function fetchPrometheusMetrics(
  serviceId: string,
  metricName:
    | "probe_duration_seconds"
    | "probe_success"
    | "probe_http_status_code"
    | "probe_http_ssl"
    | "probe_http_content_length",
): Promise<[number, number][]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 600;
  const step = 15;

  const query = `${metricName}{service_id="${serviceId}"}`;
  const url = new URL(`${PROMETHEUS_URL}/api/v1/query_range`);
  url.searchParams.set("query", query);
  url.searchParams.set("start", start.toString());
  url.searchParams.set("end", end.toString());
  url.searchParams.set("step", step.toString());

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok)
      throw new Error(`Prometheus responded with status ${response.status}`);
    const data = (await response.json()) as PrometheusQueryResponse;
    if (data.status !== "success") throw new Error("Prometheus query failed");
    if (!data.data.result?.length) return [];

    const rawValues = data.data.result[0]!.values;
    return rawValues.map(
      ([ts, val]) => [ts, parseFloat(val)] as [number, number],
    );
  } catch (error) {
    console.error(
      `[Prometheus] Error fetching ${metricName} for service ${serviceId}:`,
      error,
    );
    return [];
  }
}
