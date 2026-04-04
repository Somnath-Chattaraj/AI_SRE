import type { Request, Response } from "express";
import prisma from "../../lib/db";

export class AIActionController {
  static async listActions(req: Request, res: Response) {
    try {
      const user = res.locals.user;

      
      const incidents = await prisma.incident.findMany({
        where: { service: { userId: user.id } },
        include: { service: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const actions: object[] = [];

      for (const inc of incidents) {
        const svcName = inc.service?.name ?? "unknown";

        
        actions.push({
          id: `${inc.id}-detected`,
          type: "anomaly_detected",
          message: inc.title,
          serviceName: svcName,
          timestamp: inc.createdAt,
        });

        
        if (inc.patchStatus === "PROCESSING" || inc.patchStatus === "RESOLVED" || inc.patchStatus === "FAILED") {
          actions.push({
            id: `${inc.id}-fix`,
            type: "fix_generated",
            message: `Generating patch for: ${inc.title}`,
            serviceName: svcName,
            timestamp: new Date(inc.createdAt.getTime() + 5000),
          });
        }

        
        if (inc.prUrl) {
          actions.push({
            id: `${inc.id}-pr`,
            type: "pr_created",
            message: `PR opened: ${inc.title}`,
            serviceName: svcName,
            timestamp: inc.updatedAt,
          });
        }

        
        if (inc.patchStatus === "RESOLVED") {
          actions.push({
            id: `${inc.id}-resolved`,
            type: "auto_resolved",
            message: `Auto-resolved: ${inc.title}`,
            serviceName: svcName,
            timestamp: inc.updatedAt,
          });
        }
      }

      
      actions.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.status(200).json({ actions: actions.slice(0, 30) });
    } catch {
      res.status(500).json({ error: "Failed to fetch AI actions" });
    }
  }
}
