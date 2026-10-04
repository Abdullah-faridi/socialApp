import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerAIQueueEvents } from "./queues/ai.event";
import {
  socketAuthMiddleware,
  AuthenticatedSocket,
} from "./middlewares/socketAuth";
import { registerChatHandlers } from "./socket/chatHandler";
import { prisma } from "./config/db";
import redisClient from "./config/redis";

const app = express();
const httpServer = createServer(app);
const allowedOrigins = (
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    callback(null, !origin || allowedOrigins.includes(origin));
  },
});
export const aiQueueEvents = registerAIQueueEvents(io);
io.use((socket, next) => {
  socketAuthMiddleware(socket as AuthenticatedSocket, next);
});

io.on("connection", (socket) => {
  const userId = (socket as AuthenticatedSocket).userId;
  const sessionId = (socket as AuthenticatedSocket).sessionId;
  socket.join(`user:${userId}`);
  socket.use((packet, next) => {
    void (async () => {
      const session = await redisClient.get(`session:${sessionId}`);
      if (!session || JSON.parse(session).userId !== userId) {
        next(new Error("Session expired"));
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isBanned: true },
      });
      if (!user || user.isBanned) {
        next(new Error("Account is unavailable"));
        return;
      }
      next();
    })().catch((error: unknown) => {
      console.error(`Socket authorization failed for ${packet[0]}:`, error);
      next(new Error("Unable to authorize event"));
    });
  });

  console.log(`User ${userId} connected`);
  registerChatHandlers(io, socket as AuthenticatedSocket);
});
export { app, httpServer };
