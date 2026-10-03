import { prisma } from "../config/db";
import { CreateNotificationInput } from "../types/notification";

export const NotificationModel = {
  async create(data: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        entityId: data.entityId,
        entityType: data.entityType,
      },
    });
  },
  async getByUser(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        actor: { select: { id: true, username: true, fullName: true, profileImageURL: true } },
      },
    });
  },
  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    });
  },
};
