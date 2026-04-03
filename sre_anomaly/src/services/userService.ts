import { randomUUID } from "node:crypto";
import prisma from "../../lib/db";

export class UserService {
  static async createUser() {
    const apiKey = `sk_${randomUUID()}`;
    const user = await prisma.user.create({
      data: {
        apiKey,
      },
    });
    return user;
  }

  static async getUserByApiKey(apiKey: string) {
    return prisma.user.findUnique({
      where: { apiKey },
    });
  }
}
