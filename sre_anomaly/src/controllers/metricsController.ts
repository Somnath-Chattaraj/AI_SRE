import type { Request, Response } from "express";
import {
  fetchPrometheusMetrics,
} from "../utils/prometheus";
import prisma from "../../lib/db";

// 24-hour window — same step as anomaly worker (15s) gives up to 5760 points.
// Using 60s step keeps it to ~1440 which is plenty for a UI sparkline.
const WINDOW_SECONDS = 24 * 60 * 60; // 24 h
const STEP_SECONDS = 60;

type ServiceStatus = "healthy" | "warning" | "critical" | "unknown";

function deriveStatus(uptimePct: number, hasData: boolean): ServiceStatus {
  if (!hasData) return "unknown";
  if (uptimePct >= 99) return "healthy";
  if (uptimePct >= 90) return "warning";
  return "critical";
}

export class MetricsController {
  static async getServiceMetrics(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const user = res.locals.user as { id: string };

    try {
      // Verify the service belongs to this user
      const service = await prisma.service.findFirst({
        where: { id, userId: user.id },
      });

      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      // Fetch raw time-series from Prometheus (last 24 h at 60 s step)
      const [successPoints, durationPoints] = await Promise.all([
        fetchPrometheusMetrics(id, "probe_success", WINDOW_SECONDS, STEP_SECONDS),
        fetchPrometheusMetrics(id, "probe_duration_seconds", WINDOW_SECONDS, STEP_SECONDS),
      ]);

      const hasData = successPoints.length > 0 || durationPoints.length > 0;

      // ── Uptime % ──────────────────────────────────────────────────────────────
      const uptimePct =
        successPoints.length === 0
          ? 0
          : Math.round(
              (successPoints.filter(([, v]) => v === 1).length /
                successPoints.length) *
                10000,
            ) / 100; // 2 decimal places

      // ── Average latency (ms) ─────────────────────────────────────────────────
      const avgLatencyMs =
        durationPoints.length === 0
          ? 0
          : Math.round(
              (durationPoints.reduce((sum, [, v]) => sum + v, 0) /
                durationPoints.length) *
                1000, // seconds → ms
            );

      // ── Status ────────────────────────────────────────────────────────────────
      const status = deriveStatus(uptimePct, hasData);

      // ── Last checked timestamp ────────────────────────────────────────────────
      const lastTs =
        successPoints.length > 0
          ? successPoints[successPoints.length - 1]![0]
          : null;
      const lastChecked = lastTs
        ? new Date(lastTs * 1000).toISOString()
        : new Date().toISOString();

      // ── Time-series for charts ────────────────────────────────────────────────
      const latencyTimeSeries = durationPoints.map(([ts, v]) => ({
        timestamp: new Date(ts * 1000).toISOString(),
        value: Math.round(v * 1000), // ms
      }));

      const uptimeTimeSeries = successPoints.map(([ts, v]) => ({
        timestamp: new Date(ts * 1000).toISOString(),
        value: v,
      }));

      res.json({
        serviceId: id,
        status,
        uptime: uptimePct,
        avgLatency: avgLatencyMs,
        lastChecked,
        timeSeries: {
          latency: latencyTimeSeries,
          uptime: uptimeTimeSeries,
        },
      });
    } catch (e: any) {
      res
        .status(500)
        .json({ error: "Failed to fetch metrics", details: e.message });
    }
  }
}
