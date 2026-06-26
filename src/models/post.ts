import { prisma } from "../config/db";

export const PostModel = {
  async findAll() {
    return prisma.post.findMany({
      include: {
        author: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: { title: string; content?: string; authorId: string }) {
    return prisma.post.create({ data });
  },
};
