import type { Request, Response } from "express";
import {
  fetchPrometheusMetrics,
} from "../utils/prometheus";
import prisma from "../../lib/db";



const WINDOW_SECONDS = 24 * 60 * 60; 
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
      
      const service = await prisma.service.findFirst({
        where: { id, userId: user.id },
      });

      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }

      
      const [successPoints, durationPoints] = await Promise.all([
        fetchPrometheusMetrics(id, "probe_success", WINDOW_SECONDS, STEP_SECONDS),
        fetchPrometheusMetrics(id, "probe_duration_seconds", WINDOW_SECONDS, STEP_SECONDS),
      ]);

      const hasData = successPoints.length > 0 || durationPoints.length > 0;

      
      const uptimePct =
        successPoints.length === 0
          ? 0
          : Math.round(
              (successPoints.filter(([, v]) => v === 1).length /
                successPoints.length) *
                10000,
            ) / 100; 

      
      const avgLatencyMs =
        durationPoints.length === 0
          ? 0
          : Math.round(
              (durationPoints.reduce((sum, [, v]) => sum + v, 0) /
                durationPoints.length) *
                1000, 
            );

      
      const status = deriveStatus(uptimePct, hasData);

      
      const lastTs =
        successPoints.length > 0
          ? successPoints[successPoints.length - 1]![0]
          : null;
      const lastChecked = lastTs
        ? new Date(lastTs * 1000).toISOString()
        : new Date().toISOString();

      
      const latencyTimeSeries = durationPoints.map(([ts, v]) => ({
        timestamp: new Date(ts * 1000).toISOString(),
        value: Math.round(v * 1000), 
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
