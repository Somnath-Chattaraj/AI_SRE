import prisma from "../../lib/db";


export class IncidentService {
  // Finds incidents for a given service ID, ensuring that the service belongs to the userId provided
  static async getIncidentsByServiceId(serviceId: string, userId: string) {
    return prisma.incident.findMany({
      where: {
        serviceId,
        service: {
          userId,
        },
      },
    });
  }
}
