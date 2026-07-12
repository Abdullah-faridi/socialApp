import { Request, Response } from "express";
import { getErrorMessage } from "../helper/error";
import { CommentModel } from "../models/comment";
import { updateComment } from "../types/patch";
export async function createComment(req: Request, res: Response) {
  try {
    const { content, parentId } = req.body;
    const postId = req.params.id;
    const authorId = req.user!.id;
    const comment = await CommentModel.create(postId, authorId, {
      content,
      parentId,
    });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getComments(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
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
