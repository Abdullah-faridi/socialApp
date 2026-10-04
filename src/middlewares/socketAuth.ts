import { Socket } from "socket.io";
import { validateToken } from "../services/auth";

import { prisma } from "../config/db";
import redisClient from "../config/redis";
export interface AuthenticatedSocket extends Socket {
  userId: string;
  sessionId: string;
  fullName: string;
}

function getCookieToken(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== "token") continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void,
) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization ||
      getCookieToken(socket.handshake.headers.cookie);
    if (typeof token !== "string" || !token) {
      return next(new Error("Authentication required"));
    }
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const decoded = validateToken(cleanToken);
    const session = await redisClient.get(`session:${decoded.sessionId}`);
    if (!session || JSON.parse(session).userId !== decoded.userId) {
      return next(new Error("Session expired"));
    }
    socket.userId = decoded.userId;
    socket.sessionId = decoded.sessionId;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { fullName: true, isBanned: true },
    });
    if (!user) return next(new Error("User not found"));
    if (user.isBanned) return next(new Error("Account is banned"));
    socket.fullName = user.fullName;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}
