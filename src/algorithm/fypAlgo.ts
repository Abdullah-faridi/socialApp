import { Prisma } from "@prisma/client";
import { UserModel } from "../models/user";
import { LikeModel } from "../models/like";
import { prisma } from "../config/db";
import { getOrSet } from "../services/caching";
import redisClient from "../config/redis";
export type PostWithRelations = Prisma.PostGetPayload<{
  include: {
    author: {
      select: { id: true; fullName: true; profileImageURL: true };
    };
    _count: {
      select: { likes: true; comments: true };
    };
  };
}>;
function calculateScore(
  post: PostWithRelations,
  now: number,
  likedAuthorIds: Set<string>,
  followingIds: Set<string>,
): { score: number; breakdown: string } {
  const isFollowing = followingIds.has(post.authorId);
  const followingScore = isFollowing ? 100 : 0;

  const hasLikedFromAuthor = likedAuthorIds.has(post.authorId);
  const interactionScore = hasLikedFromAuthor ? 50 : 0;

  const ageInHours = (now - post.createdAt.getTime()) / (1000 * 60 * 60);
  const recencyScore = 10 * Math.exp(-ageInHours / 24);

  const totalEngagement = post._count.likes + post._count.comments * 2;
  const engagementScore = Math.log(totalEngagement + 1) * 3;

  const velocity = totalEngagement / Math.max(ageInHours, 0.5);
  const velocityScore = Math.log(velocity + 1) * 2;

  const WEIGHTS = {
    following: 3,
    interaction: 2,
    recency: 1,
    engagement: 1,
    velocity: 1,
  };

  const totalScore =
    followingScore * WEIGHTS.following +
    interactionScore * WEIGHTS.interaction +
    recencyScore * WEIGHTS.recency +
    engagementScore * WEIGHTS.engagement +
    velocityScore * WEIGHTS.velocity;
  const reasons = [];

  if (followingScore > 0)
    reasons.push(
      `Following (+${(followingScore * WEIGHTS.following).toFixed(0)})`,
    );

  if (interactionScore > 0)
    reasons.push(
      `Liked before (+${(interactionScore * WEIGHTS.interaction).toFixed(0)})`,
    );

  reasons.push(`Recent (+${(recencyScore * WEIGHTS.recency).toFixed(1)})`);

  if (engagementScore > 2)
    reasons.push(
      `Popular (+${(engagementScore * WEIGHTS.engagement).toFixed(1)})`,
    );

  if (velocityScore > 1)
    reasons.push(`Viral (+${(velocityScore * WEIGHTS.velocity).toFixed(1)})`);

  const breakdown = reasons.length > 0 ? reasons.join(" • ") : "Recommended";

  return { score: totalScore, breakdown };
}

export async function generateForYourPage(userId: string) {
  const cacheKey = `feed:foryou:${userId}`;
  const cachedFeed = await redisClient.get(cacheKey);

  if (cachedFeed) {
    return JSON.parse(cachedFeed);
  }
  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  const followingIds = await getOrSet(
    `user:following:${userId}`,
    300,
    async () => {
      const userFollows = await UserModel.userFollows(userId);
      return userFollows.map((f) => f.followingId);
    },
  );

  const likedData = await getOrSet(
    `user : likedAuthors:${userId}`,
    300,
    async () => {
      const userLikes = await LikeModel.getUserLikes(userId);
      return {
        likedPostIds: userLikes.map((l) => l.postId),
        likedAuthorIds: userLikes.map((l) => l.post.authorId),
      };
    },
  );
  const followingIdsSet = new Set(followingIds);
  const likedPostIdsSet = new Set(likedData.likedPostIds);
  const likedAuthorIdsSet = new Set(likedData.likedAuthorIds);

  const [followingPosts, popularPosts, recentPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        author: {
          followers: {
            some: { followerId: userId },
          },
        },

        createdAt: { gte: threeDaysAgo },
        NOT: [
          { id: { in: Array.from(likedPostIdsSet) } },
          { authorId: userId },
        ],
      },
      take: 200,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          include: {
            _count: { select: { followers: true } },
            followers: {
              where: { followerId: userId },
            },
          },
        },

        likes: {
          where: { userId },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    }),

    prisma.post.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
        NOT: [
          { id: { in: Array.from(likedPostIdsSet) } },
          { authorId: userId },
        ],
      },
      take: 100,
      orderBy: [
        { likes: { _count: "desc" } },
        { comments: { _count: "desc" } },
      ],

      include: {
        author: {
          include: {
            _count: { select: { followers: true } },
            followers: {
              where: { followerId: userId },
            },
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    }),

    prisma.post.findMany({
      where: {
        createdAt: { gte: oneHourAgo },
        NOT: [
          { id: { in: Array.from(likedPostIdsSet) } },
          { authorId: userId },
        ],
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          include: {
            _count: { select: { followers: true } },
            followers: {
              where: { followerId: userId },
            },
          },
        },
        likes: {
          where: { userId },
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    }),
  ]);

  const allPosts = [...followingPosts, ...popularPosts, ...recentPosts];
  const uniquePostMap = new Map<string, PostWithRelations>();
  allPosts.forEach((post) => {
    if (!uniquePostMap.has(post.id)) {
      uniquePostMap.set(post.id, post as PostWithRelations);
    }
  });
  const candidates = Array.from(uniquePostMap.values());
  const scoredPosts = candidates.map((post) => {
    const { score, breakdown } = calculateScore(
      post,
      now,
      likedAuthorIdsSet,
      followingIdsSet,
    );
    return {
      ...post,
      score,
      scoreBreakdown: breakdown,
    };
  });
  const result = scoredPosts.sort((a, b) => b.score - a.score).slice(0, 50);
  if (result.length === 0) {
    return { feed: [], source: "db" };
  }
  await redisClient.set(cacheKey, JSON.stringify(result), { EX: 120 });
  return result;
}
