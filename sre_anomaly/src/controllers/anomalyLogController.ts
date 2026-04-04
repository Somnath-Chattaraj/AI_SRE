import type { Request, Response } from "express";
import prisma from "../../lib/db";

export class AnomalyLogController {
  static async listAnomalyLogs(req: Request, res: Response) {
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

      const logs = await prisma.anomalyLog.findMany({
        where: { serviceId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json({ logs });
    } catch {
      res.status(500).json({ error: "Failed to fetch anomaly logs" });
    }
  }
}
