import { NextFunction, Request, Response } from "express";
import redisClient from "../config/redis";

export function rateLimit(
  prefix: string,
  limit: number,
  windowSeconds: number,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate:${prefix}:${req.ip}`;
      const count = await redisClient.incr(key);
      if (count === 1) await redisClient.expire(key, windowSeconds);
      res.setHeader("RateLimit-Limit", String(limit));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - count)));
      if (count > limit) {
        res.status(429).json({ error: "Too many requests. Try again later." });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
