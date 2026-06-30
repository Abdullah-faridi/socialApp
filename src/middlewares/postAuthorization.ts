import {Request , Response , NextFunction} from "express"
import { PostModel } from "../models/post";
import { checkOwnership } from "../helper/checkOwnership";
export async function canModifyPost(
  req: Request,
  res: Response,
  next: NextFunction
) {
    const post = await PostModel.findById(req.params.id);

    const allowed = checkOwnership({
        resource: post,
        userId: req.user!.id,
        role: req.user!.role,
        allowAdmin: true,
        res,
    });

    if (!allowed) return;

    next();
}

export async function postExists(req: Request,res: Response,next: NextFunction) {
    const post = await PostModel.findById(req.params.id);
    if (!post) {
        res.status(404).json({
        error: "Post not found",
        });
        return;
    }
    req.post = post; 
    next();
}
