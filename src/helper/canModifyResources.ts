import { NextFunction, Request, Response } from "express";
type Resource = {
  authorId: string;
} | null;
type FindById<T extends Resource> = (id: string) => Promise<T>;
export function canModifyResource<T extends Resource>(
  findById: FindById<T>,
  allowAdmin = false
) {return async (req: Request,res: Response,next: NextFunction) => {
      const resource = await findById(req.params.id);
      if (!resource) {
        return res.status(404).json({
          error: "Resource not found",
        });
      }

      const isAuthor = resource.authorId === req.user!.id;
      const isAdmin =
        req.user!.role === "ADMIN" ||
        req.user!.role === "MODERATOR";

      if (!isAuthor && !(allowAdmin && isAdmin)) {
        return res.status(403).json({
          error: "Forbidden",
        });
      }

      next();
  };
}