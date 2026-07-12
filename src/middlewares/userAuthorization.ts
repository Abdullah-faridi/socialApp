import { Request, Response, NextFunction } from "express";

import { prisma } from "../config/db";

export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      prisma.unauthorizedAccessLog
        .create({
          data: {
            userId: req.user.id,
            route: `${req.method} ${req.originalUrl}`,
            role: req.user.role,
            ipAddress: req.ip,
          },
        })
        .catch((err) =>
          console.error("Failed to log unauthorized access:", err),
        );

      res.status(404).json({ error: "Page not found" });
      return;
    }

    next();
  };
}

export function requireSelf(paramName: string = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const targetUserId = req.params[paramName];

    if (!targetUserId) {
      return res
        .status(400)
        .json({ error: `Missing ${paramName} in request params` });
    }

    if (req.user.id !== targetUserId) {
      return res.status(403).json({
        error: "You can only perform this action on your own account",
      });
    }

    next();
  };
}
