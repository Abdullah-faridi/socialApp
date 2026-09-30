import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  socketAuthMiddleware,
  AuthenticatedSocket,
} from "./middlewares/socketAuth";
import { registerChatHandlers } from "./socket/chatHandler";

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});
io.use((socket, next) => {
  socketAuthMiddleware(socket as AuthenticatedSocket, next);
});

io.on("connection", (socket) => {
  registerChatHandlers(io, socket as AuthenticatedSocket);
});
export { app, httpServer };
