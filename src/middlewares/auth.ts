import { Request, Response, NextFunction } from "express";
import { validateToken } from "../services/auth";
import redisClient from "../config/redis";
import { prisma } from "../config/db";
import { safeUserSelect } from "../models/user";

async function auth(req: Request, res: Response, next: NextFunction){
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
    const user  = await prisma.user.findUnique({ where: {id: userId } , select : safeUserSelect})
    if (!user) {
      res.status(404).json({
          error: "Invalid user",});
      return;
    }
    req.user = user;
    req.sessionId =decoded.sessionId;;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export default auth;
