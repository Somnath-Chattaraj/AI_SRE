import prisma from "../../lib/db";

export class IncidentService {
  static async getIncidentsByServiceId(serviceId: string, userId: string) {
    return prisma.incident.findMany({
      where: { serviceId, service: { userId } },
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAllIncidentsByUserId(userId: string) {
    return prisma.incident.findMany({
      where: { service: { userId } },
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createIncident(
    userId: string,
    data: {
      serviceId: string;
      title: string;
      description?: string;
      type?: string;
      severity?: string;
      details?: Record<string, unknown>;
    }
  ) {
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, userId },
    });
    if (!service) return null;

    return prisma.incident.create({
      data: {
        serviceId: data.serviceId,
        title: data.title,
        description: data.description,
        type: data.type ?? "manual",
        severity: data.severity ?? "MEDIUM",
        details: (data.details ?? {}) as any,
        patchStatus: "PENDING",
      },
      include: { service: { select: { name: true } } },
    });
  }

  static async createIncidentNoAuth(data: {
    serviceId: string;
    title: string;
    description?: string;
    type?: string;
    severity?: string;
    details?: Record<string, unknown>;
  }) {
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId },
    });
    if (!service) return null;

    const incident = await prisma.incident.create({
      data: {
        serviceId: data.serviceId,
        title: data.title,
        description: data.description,
        type: data.type ?? "manual",
        severity: data.severity ?? "MEDIUM",
        details: (data.details ?? {}) as any,
        patchStatus: "PENDING",
      },
      include: { service: { select: { name: true } } },
    });

    const patcherUrl = process.env.PATCHER_URL ?? "http://localhost:4000";
    fetch(`${patcherUrl}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: incident.id }),
    }).catch((err) => console.error("[Patcher] Trigger failed:", err));

    return incident;
  }
}
