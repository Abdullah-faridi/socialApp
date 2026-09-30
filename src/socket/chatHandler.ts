// socket/chat.handler.ts
import { Server } from "socket.io";
import { AuthenticatedSocket } from "../middlewares/socketAuth";
import redisClient from "../config/redis";
import { ChatRoomModel } from "../models/chatRoom";
import { MessageModel } from "../models/message";
export function registerChatHandlers(io: Server, socket: AuthenticatedSocket) {
  const userId = socket.userId;
  const fullName = socket.fullName;

  console.log(`User connected: ${fullName} (${userId})`);
  socket.join(userId);
  socket.on("join_room", async ({ roomId }: { roomId: string }) => {
    const room = await ChatRoomModel.findById(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }
    const isMember = await ChatRoomModel.isMember(userId, roomId);
    if (!isMember) {
      socket.emit("error", {
        message: "You must join this room first",
      });
      return;
    }
    await socket.join(roomId);
    const { messages } = await MessageModel.getByRoom(roomId);

    socket.emit("chat_history", {
      roomId,
      messages,
    });
    socket.to(roomId).emit("user_joined", {
      userId,
      fullName,
      roomId,
    });
    console.log(`${fullName} joined room ${roomId}`);
  });
  socket.on("leave_room", async ({ roomId }: { roomId: string }) => {
    await socket.leave(roomId);

    socket.to(roomId).emit("user_left", {
      userId,
      fullName,
      roomId,
    });

    console.log(`${fullName} left room ${roomId}`);
  });
  socket.on(
    "send_message",
    async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!content || content.trim().length === 0) {
        socket.emit("error", { message: "Message cannot be empty" });
        return;
      }
      if (content.length > 1000) {
        socket.emit("error", { message: "Message too long" });
        return;
      }
      const isMember = await ChatRoomModel.isMember(userId, roomId);
      if (!isMember) {
        socket.emit("error", { message: "You must join this room first" });
        return;
      }
      const message = await MessageModel.create(userId, roomId, content.trim());

      io.to(roomId).emit("new_message", {
        id: message.id,
        content: message.content,
        sender: message.sender,
        roomId,
        createdAt: message.createdAt,
      });
    },
  );
  socket.on(
    "delete_message",
    async ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      const message = await MessageModel.findById(messageId);

      if (!message) {
        socket.emit("error", { message: "Message not found" });
        return;
      }
      if (message.senderId !== userId) {
        socket.emit("error", {
          message: "You can only delete your own messages",
        });
        return;
      }

      await MessageModel.softDelete(messageId);
      io.to(roomId).emit("message_deleted", {
        messageId,
        roomId,
        content: "This message was deleted",
      });
    },
  );
  socket.on(
    "load_more_messages",
    async ({ roomId, cursor }: { roomId: string; cursor: string }) => {
      const isMember = await ChatRoomModel.isMember(userId, roomId);
      if (!isMember) {
        socket.emit("error", { message: "Not a member of this room" });
        return;
      }

      const result = await MessageModel.getByRoom(roomId, cursor);
      socket.emit("more_messages", {
        roomId,
        ...result,
      });
    },
  );
  socket.on("user_typing", ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit("typing_indicator", {
      userId,
      fullName,
      roomId,
    });
  });

  async function setUserOnline() {
    await redisClient.set(`presence:${userId}`, "1", {
      EX: 30,
    });

    socket.broadcast.emit("user_online", { userId });
  }
  socket.on("disconnect", async () => {
    await redisClient.del(`presence:${userId}`);
    socket.broadcast.emit("user_offline", { userId });
    console.log(`${fullName} disconnected`);
  });
  socket.on("heartbeat", async () => {
    await redisClient.set(`presence:${userId}`, "1", {
      EX: 30,
    });
  });
  setUserOnline();
}
