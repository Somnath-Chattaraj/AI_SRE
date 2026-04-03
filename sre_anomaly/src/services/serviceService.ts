import prisma from "../../lib/db";


export class ServiceService {
  static async createService(userId: string, name: string, url_server: string, url_codebase: string) {
    return prisma.service.create({
      data: {
        name,
        url_server,
        url_codebase,
        userId,
      },
    });
  }

  static async getServicesByUser(userId: string) {
    return prisma.service.findMany({
      where: { userId },
    });
  }

  static async getServiceByIdAndUser(id: string, userId: string) {
    return prisma.service.findFirst({
      where: { id, userId },
    });
  }

  static async deleteService(id: string, userId: string) {
    const service = await this.getServiceByIdAndUser(id, userId);
    if (!service) {
      return null;
    }
    return prisma.service.delete({
      where: { id: service.id },
    });
  }
}
