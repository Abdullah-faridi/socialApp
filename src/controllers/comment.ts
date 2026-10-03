import { io } from "../server";
import { Request, Response } from "express";
import { getErrorMessage } from "../utils/error";
import { CommentModel } from "../models/comment";
import { updateComment } from "../types/patch";
import { NotificationModel } from "../models/notification";
import { NotificationType } from "@prisma/client";
import { PostModel } from "../models/post";
import { prisma } from "../config/db";
export async function createComment(req: Request, res: Response) {
  try {
    const { content, parentId } = req.body;
    const postId = req.params.id;
    const authorId = req.user!.id;
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 5000
    ) {
      res
        .status(400)
        .json({ error: "Comment must contain 1 to 5000 characters" });
      return;
    }
    if (parentId !== undefined && parentId !== null) {
      if (typeof parentId !== "string") {
        res.status(400).json({ error: "Invalid parent comment" });
        return;
      }
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, postId, isDeleted: false },
        select: { id: true },
      });
      if (!parent) {
        res
          .status(400)
          .json({ error: "Parent comment does not belong to this post" });
        return;
      }
    }
    const comment = await CommentModel.create(postId, authorId, {
      content,
      parentId,
    });
    const post = await PostModel.findById(postId);
    if (post && post.authorId !== authorId)
      await NotificationModel.create({
        userId: post!.authorId,
        actorId: req.user!.id,
        type: NotificationType.COMMENT,
        entityId: postId,
        entityType: "post",
      });

    if (post && post.authorId !== authorId)
      io.to(`user:${post.authorId}`).emit("notification", {
        type: "comment",
        actor: {
          id: req.user!.id,
        },
        entityId: postId,
      });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getComments(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);
    const page =
      Number.isFinite(rawPage) && rawPage > 0
        ? Math.min(Math.floor(rawPage), 100000)
        : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(Math.floor(rawLimit), 100)
        : 10;
    const result = await CommentModel.get(postId, page, limit);
    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function updateComment(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const updates = req.body as updateComment;
    if (
      !updates ||
      typeof updates.content !== "string" ||
      !updates.content.trim() ||
      updates.content.length > 5000 ||
      Object.keys(req.body ?? {}).some((key) => key !== "content")
    ) {
      res.status(400).json({ error: "Invalid comment content" });
      return;
    }
    const updatedComment = await CommentModel.update(id, updates);
    res.status(200).json({ updatedComment });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function deleteComment(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const deletedComment = await CommentModel.delete(id);
    res.status(200).json({ deleted: deletedComment });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
