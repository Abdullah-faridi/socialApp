import { prisma } from "../config/db";
import { updatePost } from "../types/patch";
import { Prisma } from "@prisma/client";
import { CreatePostInput } from "../types/postCreate";
import { Tsquery } from "pg-tsquery";
const tsQueryParser = new Tsquery();
export const PostModel = {
  async findAll(cursor?: string, limit: number = 20) {
    const posts = await prisma.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        author: {
          select: { id: true, fullName: true, profileImageURL: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });
    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();
    return {
      posts,
      hasMore,
      nextCursor: hasMore ? posts[posts.length - 1].id : null,
    };
  },

  async create(
    authorId: string,
    data: CreatePostInput,
    tx: Prisma.TransactionClient = prisma,
  ) {
    return tx.post.create({
      data: {
        ...data,
        authorId,
      },
    });
  },
  async update(postId: string, data: updatePost) {
    return prisma.post.update({ where: { id: postId }, data });
  },
  async findById(postId: string) {
    return prisma.post.findUnique({ where: { id: postId } });
  },
  async delete(postId: string) {
    return prisma.post.delete({ where: { id: postId } });
  },
  async search(userQuery: string) {
    const processedQuery = tsQueryParser.parseAndStringify(userQuery);
    return prisma.post.findMany({
      where: {
        OR: [
          {
            content: {
              search: processedQuery,
            },
          },
          {
            tags: {
              has: userQuery.toLowerCase(),
            },
          },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImageURL: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  },
};
