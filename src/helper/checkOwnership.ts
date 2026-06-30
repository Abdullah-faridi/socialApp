
import { Response } from "express";
type CheckOwnershipParams = {
  resource: {
    authorId: string;
  } | null;
  userId: string;
  role?: string;
  allowAdmin?: boolean;
  res: Response;
};

export function checkOwnership({
  resource,
  userId,
  role,
  allowAdmin = false,
  res,
}: CheckOwnershipParams): boolean {
  if (!resource) {
    res.status(404).json({
      error: "Resource not found",
    });

    return false;
  }

  const isAuthor = resource.authorId === userId;

  const isAdmin =
    role === "ADMIN" ||
    role === "MODERATOR";

  if (!isAuthor && !(allowAdmin && isAdmin)) {
    res.status(403).json({
      error: "Forbidden",
    });

    return false;
  }

  return true;
}