import { prisma } from "../config/db";
import { Comment } from "../types/commentCreate";
import { updateComment } from "../types/patch";

export const CommentModel = {
  async create(postId: string, authorId: string, data: Comment) {
    await prisma.comment.create({
      data: {
        ...data,
        authorId,
        postId,
      },
    });
  },
  async get(postId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          postId,
          parentId: null,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              profileImageURL: true,
            },
          },
        },
      }),
      prisma.comment.count({
        where: {
          postId,
          parentId: null,
          isDeleted: false,
        },
      }),
    ]);
    return {
      comments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  },
  async update(commentId: string, data: updateComment) {
    return prisma.comment.update({ where: { id: commentId }, data });
  },
  async delete(commentId: string) {
    return prisma.comment.delete({ where: { id: commentId } });
  },
  async findById(commentId: string) {
    return prisma.comment.findUnique({ where: { id: commentId } });
  },
};
