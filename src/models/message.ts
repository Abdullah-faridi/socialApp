import { prisma } from "../config/db";
export const MessageModel = {
  async create(senderId: string, roomId: string, content: string) {
    return prisma.message.create({
      data: { senderId, roomId, content },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
      },
    });
  },
  async getByRoom(roomId: string, cursor?: string, limit: number = 50) {
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor),
          },
        }),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
      },
    });

    return {
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      nextCursor:
        messages.length > 0 ? messages[0].createdAt.toISOString() : null,
    };
  },

  async softDelete(messageId: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: "This message was deleted",
      },
    });
  },
  async findById(messageId: string) {
    return prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, roomId: true },
    });
  },
};
