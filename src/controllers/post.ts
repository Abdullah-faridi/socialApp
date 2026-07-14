import { PostModel } from "../models/post";
import { Request, Response } from "express";
import { getErrorMessage } from "../helper/error";
import { updatePost } from "../types/patch";
import { LikeModel } from "../models/like";
import { savePostModel } from "../models/savePost";
import { invalidateLikeCache } from "../helper/invalidateCache";
import { UserModel } from "../models/user";
import { invalidateUserFeedsCache } from "../helper/invalidateCache";
import { generateForYourPage } from "../algorithm/fypAlgo";
import { paginateFeed } from "../helper/paginate";
import { validateFileMagicBytes } from "../helper/validateMagicFilesbyte";
import { uploadToR2 } from "../services/r2.services";
import { PostMediaModel } from "../models/postMedia";

export async function createPost(req: Request, res: Response) {
  const { title, content, tags } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  try {
    const mediaUploads = files?.length
      ? await Promise.all(
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
            return { key, url, mimeType: check.mime! };
          }),
        )
      : [];
    const post = await PostModel.create(req.user!.id, {
      title,
      content,
      tags,
    });
    const media = mediaUploads.length
      ? await PostMediaModel.createMany(
          post.id,
          mediaUploads.map((m, index) => ({
            url: m.url,
            key: m.key,
            mimeType: m.mimeType,
            order: index,
          })),
        )
      : [];
    const followerIds = await UserModel.getFollowers(req.user!.id);
    await Promise.all(
      followerIds.map((f) => invalidateUserFeedsCache(f.followerId)),
    );

    res.status(201).json({ post: { ...post, media } });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getAllPosts(req: Request, res: Response) {
  try {
    const cursor = (req.query.cursor as string) || undefined;
    const limit = Number(req.query.limit) || 20;
    const posts = PostModel.findAll(cursor, limit);
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function getPersonalizedFeed(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
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
    const post = await PostModel.findById(postId);
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
    const deletedPost = await PostModel.delete(postId);
    if (!deletedPost) {
      res.status(404).json({ message: "post not found" });
      return;
    }
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
    await invalidateLikeCache(userId);
    if (toggle.saved) {
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
  const userQuery = req.query.q as string;
  if (!userQuery || userQuery.trim().length === 0) {
    res.status(400).json({ error: "Search query is required" });
    return;
  }

  if (userQuery.trim().length < 2) {
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
  const userQuery = req.query.q as string;
  if (!userQuery || userQuery.trim().length === 0) {
    res.status(400).json({ error: "Query is required" });
    return;
  }
  try {
    const posts = await PostModel.semanticSearch(userQuery.trim());
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
