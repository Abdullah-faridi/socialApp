import { CommentModel } from "../models/comment";
import { checkOwnership} from "../helper/checkOwnership";
import { Request , Response , NextFunction } from "express";
export async function canModifyComment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const comment = await CommentModel.findById(req.params.id);
  const allowed = checkOwnership({
    resource: comment,
    userId: req.user!.id,
    role: req.user!.role,
    allowAdmin: true,
    res,
  });

  if (!allowed) return;

  next();
}