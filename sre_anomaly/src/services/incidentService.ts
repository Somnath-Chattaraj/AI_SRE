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
}
