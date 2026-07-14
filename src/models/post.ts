import { prisma } from "../config/db";
import { updatePost } from "../types/patch";
import { Prisma } from "@prisma/client";
import { CreatePostInput } from "../types/postCreate";
import { Tsquery } from "pg-tsquery";
import { generateEmbedding } from "../helper/generateEmbeddings";

async function generateAndStoreEmbeddings(postId: string, text: string) {
  const embedding = await generateEmbedding(text);
  const vector = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "posts"
    SET embedding = ${vector}::vector
    WHERE id = ${postId}
  `;
}

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
    const post = await tx.post.create({
      data: {
        ...data,
        authorId,
      },
    });
    generateAndStoreEmbeddings(
      post.id,
      `${post.title} ${post.content} ${post.tags.join(" ")}`,
    );
    // .catch((err) => console.error("Embedding generation failed:", err));

    return post;
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
    const processedQuery = userQuery
      .trim()
      .split(" ")
      .filter(Boolean)
      .join(" & ");
    return prisma.post.findMany({
      where: {
        OR: [
          {
            content: {
              search: processedQuery,
            },
          },
          {
            title: {
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
  async semanticSearch(userQuery: string) {
    const queryEmbedding = await generateEmbedding(userQuery);
    const vectorString = `[${queryEmbedding.join(",")}]`;
    const results = await prisma.$queryRaw<
      { id: string; similarity: number }[]
    >`
    SELECT
      id,
      1 - (embedding <=> ${vectorString}::vector) AS similarity
    FROM posts
    WHERE embedding IS NOT NULL
    AND (1 - (embedding <=> ${vectorString}::vector)) > 0.5
    ORDER BY similarity DESC
    LIMIT 10
  `;
    const postIds = results.map((r) => r.id);
    if (postIds.length === 0) return [];
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            profileImageURL: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });
    const similarityMap = new Map(results.map((r) => [r.id, r.similarity]));
    return posts
      .map((post) => ({
        ...post,
        similarity: similarityMap.get(post.id),
      }))
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
  },
};
