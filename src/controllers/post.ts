import { io } from "../server";
import { indexPost, PostModel } from "../models/post";
import { Request, Response } from "express";
import { getErrorMessage } from "../utils/error";
import { updatePost } from "../types/patch";
import { LikeModel } from "../models/like";
import { savePostModel } from "../models/savePost";
import { invalidateLikeCache } from "../utils/invalidateCache";
import { UserModel } from "../models/user";
import { invalidateUserFeedsCache } from "../utils/invalidateCache";
import { generateForYourPage } from "../algorithm/fypAlgo";
import { paginateFeed } from "../utils/paginate";
import { validateFileMagicBytes } from "../utils/validateMagicFilesbyte";
import { deleteFromR2, uploadToR2 } from "../services/r2.services";
import { PostMediaModel } from "../models/postMedia";
import { NotificationModel } from "../models/notification";
import { NotificationType } from "@prisma/client";
import { prisma } from "../config/db";

export async function createPost(req: Request, res: Response) {
  const { title, content, tags } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 200 ||
    typeof content !== "string" ||
    !content.trim() ||
    content.length > 50000
  ) {
    res
      .status(400)
      .json({
        error:
          "Title and content are required and must be within allowed lengths",
      });
    return;
  }
  let normalizedTags: string[] = [];
  try {
    normalizedTags = typeof tags === "string" ? JSON.parse(tags) : (tags ?? []);
  } catch {
    res.status(400).json({ error: "Tags must be a JSON array" });
    return;
  }
  if (
    !Array.isArray(normalizedTags) ||
    normalizedTags.length > 20 ||
    normalizedTags.some((tag) => typeof tag !== "string" || tag.length > 40)
  ) {
    res.status(400).json({ error: "Invalid tags" });
    return;
  }
  const uploadedKeys: string[] = [];
  let postCreated = false;
  try {
    const mediaUploads = files?.length
      ? await (async () => {
          const settled = await Promise.allSettled(
            files.map(async (file) => {
              const check = await validateFileMagicBytes(file.buffer, "media");
              if (!check.valid) {
                throw new Error(check.reason);
              }
              const { key, url } = await uploadToR2(
                file.buffer,
                check.mime!,
                check.ext!,
                "posts",
              );
              uploadedKeys.push(key);
              return { key, url, mimeType: check.mime! };
            }),
          );
          const failed = settled.find((item) => item.status === "rejected");
          if (failed?.status === "rejected") throw failed.reason;
          return settled.flatMap((item) =>
            item.status === "fulfilled" ? [item.value] : [],
          );
        })()
      : [];
    const { post, media } = await prisma.$transaction(async (tx) => {
      const createdPost = await PostModel.create(
        req.user!.id,
        {
          title: title.trim(),
          content,
          tags: normalizedTags.map((tag) => tag.trim().toLowerCase()),
        },
        tx,
      );
      const createdMedia = mediaUploads.length
        ? await PostMediaModel.createMany(
            createdPost.id,
            mediaUploads.map((m, index) => ({ ...m, order: index })),
            tx,
          )
        : [];
      return { post: createdPost, media: createdMedia };
    });
    postCreated = true;
    void indexPost(post).catch((error) =>
      console.error("Embedding generation failed:", error),
    );
    try {
      const followerIds = await UserModel.getFollowers(req.user!.id);
      await Promise.all(
        followerIds.map((f) => invalidateUserFeedsCache(f.followerId)),
      );
    } catch (error) {
      console.error("Failed to invalidate follower feeds:", error);
    }

    res.status(201).json({ post: { ...post, media } });
  } catch (err) {
    if (!postCreated && uploadedKeys.length)
      await Promise.allSettled(uploadedKeys.map((key) => deleteFromR2(key)));
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getAllPosts(req: Request, res: Response) {
  try {
    const cursor = (req.query.cursor as string) || undefined;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));
    const posts = await PostModel.findAll(cursor, limit);
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function getPersonalizedFeed(req: Request, res: Response) {
  try {
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);
    const page =
      Number.isFinite(rawPage) && rawPage > 0
        ? Math.min(Math.floor(rawPage), 100000)
        : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 50)
        : 10;
    const feed = await generateForYourPage(req.user!.id);
    const result = paginateFeed(feed, page, limit);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function updatePost(req: Request, res: Response) {
  const postId = req.params.id;
  const updates = req.body as updatePost;
  const keys = Object.keys(req.body ?? {});
  if (
    !keys.length ||
    keys.some((key) => !["title", "content", "tags"].includes(key))
  ) {
    res.status(400).json({ error: "Invalid post fields" });
    return;
  }
  if (
    updates.title !== undefined &&
    (typeof updates.title !== "string" ||
      !updates.title.trim() ||
      updates.title.length > 200)
  ) {
    res.status(400).json({ error: "Invalid title" });
    return;
  }
  if (
    updates.content !== undefined &&
    (typeof updates.content !== "string" || updates.content.length > 50000)
  ) {
    res.status(400).json({ error: "Invalid content" });
    return;
  }
  if (
    updates.tags !== undefined &&
    (!Array.isArray(updates.tags) ||
      updates.tags.length > 20 ||
      updates.tags.some((tag) => typeof tag !== "string" || tag.length > 40))
  ) {
    res.status(400).json({ error: "Invalid tags" });
    return;
  }
  try {
    const post = await PostModel.update(postId, updates);
    if (!post) {
      res.status(404).json({ message: "post not found" });
      return;
    }
    res.status(200).json({ post });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function getPostById(req: Request, res: Response) {
  const postId = req.params.id;
  try {
    const post = await PostModel.findFullById(postId);
    if (!post) {
      res.status(404).json({ message: "invalid id" });
      return;
    }
    res.status(200).json({ post });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function deletePost(req: Request, res: Response) {
  const postId = req.params.id;
  try {
    const mediaKeys = await prisma.postMedia.findMany({
      where: { postId },
      select: { key: true },
    });
    const deletedPost = await PostModel.delete(postId);
    if (!deletedPost) {
      res.status(404).json({ message: "post not found" });
      return;
    }
    const cleanup = await Promise.allSettled(
      mediaKeys.map(({ key }) => deleteFromR2(key)),
    );
    cleanup
      .filter((result) => result.status === "rejected")
      .forEach((result) => {
        if (result.status === "rejected")
          console.error("Failed to remove deleted post media:", result.reason);
      });
    res.status(200).json({ message: "post deleted", post: deletedPost });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function likePost(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;

    const toggle = await LikeModel.add(postId, userId);
    const post = await PostModel.findById(postId);

    await invalidateLikeCache(userId);

    if (toggle.saved) {
      if (post!.authorId !== userId)
        await NotificationModel.create({
          userId: post!.authorId,
          actorId: userId,
          type: NotificationType.LIKE,
          entityId: postId,
          entityType: "post",
        });

      if (post!.authorId !== userId)
        io.to(`user:${post!.authorId}`).emit("notification", {
          type: "like",
          actor: {
            id: userId,
          },
          entityId: postId,
        });

      res.status(200).json({ message: "Liked" });
    } else {
      res.status(200).json({ message: "unliked" });
    }
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function likeCount(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const likes = await LikeModel.getLikeCount(postId);
    res.status(200).json({ count: likes });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function savePost(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;

    const toggle = await savePostModel.add(postId, userId);

    if (toggle.saved) {
      res.status(200).json({ message: "Post saved" });
    } else {
      res.status(200).json({ message: "Post unsaved" });
    }
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function savePostCount(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const saves = await savePostModel.saveCount(postId);
    res.status(200).json({ count: saves });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function searchByKeyword(req: Request, res: Response) {
  const userQuery = req.query.q;
  if (typeof userQuery !== "string" || userQuery.trim().length === 0) {
    res.status(400).json({ error: "Search query is required" });
    return;
  }

  if (userQuery.trim().length < 2 || userQuery.length > 200) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }
  try {
    const posts = await PostModel.search(userQuery);
    res.status(200).json({ posts, total: posts.length });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function semanticSearch(req: Request, res: Response) {
  const userQuery = req.query.q;
  if (typeof userQuery !== "string" || userQuery.trim().length === 0) {
    res.status(400).json({ error: "Query is required" });
    return;
  }
  if (userQuery.length > 200) {
    res.status(400).json({ error: "Query is too long" });
    return;
  }
  try {
    const posts = await PostModel.semanticSearch(userQuery.trim());
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
