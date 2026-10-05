import { Request, Response, NextFunction } from "express";
import { validateToken } from "../services/auth";
import redisClient from "../config/redis";
import { prisma } from "../config/db";
import { authenticatedUserSelect } from "../models/user";

async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token as string | undefined;

    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const decoded = validateToken(token);
    const session = await redisClient.get(`session:${decoded.sessionId}`);
    if (!session) {
      res.status(401).json({
        error: "Session expired",
      });
      return;
    }
    const { userId } = JSON.parse(session);
    if (!userId || userId !== decoded.userId) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: authenticatedUserSelect,
    });
    if (!user) {
      res.status(404).json({
        error: "Invalid user",
      });
      return;
    }
    if (user.isBanned) {
      await redisClient.del(`session:${decoded.sessionId}`);
      res.status(403).json({ error: "Account is banned" });
      return;
    }

    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    if (error instanceof SyntaxError) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    next(error);
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.token as string | undefined;
    if (!token) {
      next();
      return;
    }

    let decoded: ReturnType<typeof validateToken>;
    try {
      decoded = validateToken(token);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "JsonWebTokenError" ||
          error.name === "TokenExpiredError" ||
          error.name === "NotBeforeError")
      ) {
        next();
        return;
      }
      throw error;
    }

    const session = await redisClient.get(`session:${decoded.sessionId}`);
    if (!session) {
      next();
      return;
    }
    const { userId } = JSON.parse(session);
    if (!userId || userId !== decoded.userId) {
      next();
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: authenticatedUserSelect,
    });
    if (!user || user.isBanned) {
      next();
      return;
    }

    req.user = user;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    if (error instanceof SyntaxError) {
      next();
      return;
    }
    next(error);
  }
}

export default auth;
