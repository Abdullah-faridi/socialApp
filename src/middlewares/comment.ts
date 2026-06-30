import { NextFunction, Request, Response } from "express";
import { CommentModel } from "../models/comment";

export async function commentExists(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const comment = await CommentModel.findById(req.params.id);

    if (!comment) {
      res.status(404).json({
        error: "Comment not found",
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}