import { prisma } from "../config/db";
import { updatePost } from "../types/patch";
import { Prisma } from "@prisma/client";
import { CreatePostInput } from "../types/postCreate";
import { Tsquery } from "pg-tsquery";
import { generateEmbedding } from "../utils/generateEmbeddings";

async function generateAndStoreEmbeddings(postId: string, text: string) {
  const embedding = await generateEmbedding(text);
  const vector = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "posts"
    SET embedding = ${vector}::vector
    WHERE id = ${postId}
  `;
}

export function indexPost(post: { id: string; title: string; content: string; tags: string[] }) {
  return generateAndStoreEmbeddings(post.id, `${post.title} ${post.content} ${post.tags.join(" ")}`);
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
        media: true,
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
  async findById(postId: string) {
    return prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        authorId: true,
      },
    });
  },
  async findFullById(postId: string) {
    return prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, fullName: true, username: true, profileImageURL: true } },
        media: { orderBy: { order: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    });
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
    return post;
  },
  async update(postId: string, data: updatePost) {
    const post = await prisma.post.update({ where: { id: postId }, data });
    void indexPost(post).catch((error) => console.error("Embedding refresh failed:", error));
    return post;
  },
  async delete(postId: string) {
    return prisma.post.delete({ where: { id: postId } });
  },
  async search(userQuery: string) {
    const processedQuery = userQuery
      .trim()
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}_]/gu, ""))
      .filter(Boolean)
      .join(" & ");
    if (!processedQuery) return [];
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
        media: true,
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
        media: true,
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
