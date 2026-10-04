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
  const onAsync = (
    event: string,
    handler: (...args: any[]) => Promise<void>,
  ) => {
    socket.on(event, (...args: any[]) => {
      void handler(...args).catch((error: unknown) => {
        console.error(`Socket event ${event} failed:`, error);
        socket.emit("error", { message: "Request failed" });
      });
    });
  };
  onAsync("join_room", async ({ roomId }: { roomId: string }) => {
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
  onAsync("leave_room", async ({ roomId }: { roomId: string }) => {
    if (typeof roomId !== "string" || !socket.rooms.has(roomId)) return;
    await socket.leave(roomId);

    socket.to(roomId).emit("user_left", {
      userId,
      fullName,
      roomId,
    });

    console.log(`${fullName} left room ${roomId}`);
  });
  onAsync(
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
  onAsync(
    "delete_message",
    async ({ messageId, roomId }: { messageId: string; roomId: string }) => {
      const message = await MessageModel.findById(messageId);

      if (!message || message.roomId !== roomId) {
        socket.emit("error", { message: "Message not found" });
        return;
      }
      if (message.senderId !== userId) {
        socket.emit("error", {
          message: "You can only delete your own messages",
        });
        return;
      }
      if (!(await ChatRoomModel.isMember(userId, message.roomId))) {
        socket.emit("error", { message: "Not a member of this room" });
        return;
      }

      await MessageModel.softDelete(messageId);
      io.to(message.roomId).emit("message_deleted", {
        messageId,
        roomId: message.roomId,
      });
    },
  );
  onAsync(
    "edit_message",
    async ({
      messageId,
      roomId,
      content,
    }: {
      messageId: string;
      roomId: string;
      content: string;
    }) => {
      if (typeof content !== "string" || !content.trim()) {
        socket.emit("error", { message: "Message cannot be empty" });
        return;
      }
      if (content.length > 1000) {
        socket.emit("error", { message: "Message too long" });
        return;
      }
      const message = await MessageModel.findById(messageId);
      if (!message || message.roomId !== roomId) {
        socket.emit("error", { message: "Message not found" });
        return;
      }
      if (message.senderId !== userId) {
        socket.emit("error", {
          message: "You can only edit your own messages",
        });
        return;
      }
      if (!(await ChatRoomModel.isMember(userId, roomId))) {
        socket.emit("error", { message: "Not a member of this room" });
        return;
      }
      const result = await MessageModel.edit(messageId, content.trim());
      if (result.count === 0) {
        socket.emit("error", { message: "Message not found" });
        return;
      }
      io.to(roomId).emit("message_edited", {
        messageId,
        roomId,
        content: content.trim(),
      });
    },
  );
  onAsync(
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
  socket.on("user_typing", (payload: { roomId?: string } | undefined) => {
    const roomId = payload?.roomId;
    if (typeof roomId !== "string" || !socket.rooms.has(roomId)) return;
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
    try {
      const sockets = await io.in(userId).fetchSockets();
      if (!sockets.length) {
        await redisClient.del(`presence:${userId}`);
        socket.broadcast.emit("user_offline", { userId });
      }
      console.log(`${fullName} disconnected`);
    } catch (error) {
      console.error("Failed to clear online presence:", error);
    }
  });
  onAsync("heartbeat", async () => {
    await redisClient.set(`presence:${userId}`, "1", {
      EX: 30,
    });
  });
  void setUserOnline().catch((error) =>
    console.error("Failed to set online presence:", error),
  );
}
