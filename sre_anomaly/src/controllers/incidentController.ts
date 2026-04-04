import type { Request, Response } from "express";
import { IncidentService } from "../services/incidentService";

function mapIncident(inc: any) {
  const details = (inc.details ?? {}) as Record<string, unknown>;
  const confidence = typeof details.ai_confidence === "number"
    ? Math.round(details.ai_confidence * 100)
    : undefined;
  const patchesRaw = details.patches_applied;
  const patches = Array.isArray(patchesRaw)
    ? (patchesRaw as { filePath: string; rationale: string }[])
    : undefined;

  return {
    id: inc.id,
    serviceId: inc.serviceId,
    serviceName: inc.service?.name ?? "unknown",
    title: inc.title,
    description: inc.description ?? undefined,
    type: inc.type,
    severity: inc.severity.toLowerCase(),
    status: inc.patchStatus === "RESOLVED" ? "resolved"
      : inc.patchStatus === "PROCESSING" ? "investigating"
      : inc.patchStatus === "FAILED" ? "failed"
      : "open",
    patchStatus: inc.patchStatus,
    prUrl: inc.prUrl ?? undefined,
    aiAnalysis: inc.description ?? undefined,
    rootCause: (details.root_cause as string) ?? undefined,
    confidence,
    patches,
    patchAnalysis: (details.patch_analysis as string) ?? undefined,
    patchModel: (details.patch_model as string) ?? undefined,
    patchedAt: (details.patched_at as string) ?? undefined,
    detectedAt: inc.createdAt,
    resolvedAt: inc.patchStatus === "RESOLVED" ? inc.updatedAt : undefined,
  };
}

export class IncidentController {
  static async listIncidents(req: Request, res: Response) {
    try {
      const user = res.locals.user;
      const serviceId = req.query.service_id as string | undefined;

      const raw = serviceId
        ? await IncidentService.getIncidentsByServiceId(serviceId, user.id)
        : await IncidentService.getAllIncidentsByUserId(user.id);

      res.status(200).json({ incidents: raw.map(mapIncident) });
    } catch {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  }
}
