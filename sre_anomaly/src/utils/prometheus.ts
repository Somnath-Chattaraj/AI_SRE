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
