import { Request, Response, NextFunction } from "express";
import { ChatRoomModel } from "../models/chatRoom";
import { MessageModel } from "../models/message";
import { getErrorMessage } from "../utils/error";
import { prisma } from "../config/db";
import { randomUUID } from "crypto";
export async function createRoom(req: Request, res: Response) {
  const { name, description, type } = req.body;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    res.status(400).json({ error: "Room name must contain 1 to 100 characters" });
    return;
  }
  if (type !== undefined && !["PUBLIC", "PRIVATE"].includes(type)) {
    res.status(400).json({ error: "Invalid room type" });
    return;
  }
  if (description !== undefined && (typeof description !== "string" || description.length > 1000)) {
    res.status(400).json({ error: "Invalid room description" });
    return;
  }
  try {
    const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "room")}-${randomUUID().slice(0, 8)}`;
    const room = await ChatRoomModel.create(req.user!.id, {
      name: name.trim(),
      slug,
      description,
      type,
    });

    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getAllRooms(req: Request, res: Response) {
  try {
    const rooms = await ChatRoomModel.getAllPublic();
    res.status(200).json({ rooms });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getRoomById(req: Request, res: Response) {
  try {
    const room = await ChatRoomModel.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.type === "PRIVATE" && !(await ChatRoomModel.isMember(req.user!.id, req.params.id))) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.status(200).json({ room });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function joinRoom(req: Request, res: Response) {
  try {
    const room = await ChatRoomModel.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.type === "PRIVATE") {
      res.status(403).json({ error: "Private rooms require an invitation" });
      return;
    }
    const result = await ChatRoomModel.joinRoom(req.user!.id, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function leaveRoom(req: Request, res: Response) {
  try {
    await ChatRoomModel.leaveRoom(req.user!.id, req.params.id);
    res.status(200).json({ message: "Left room successfully" });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getRoomMembers(req: Request, res: Response) {
  try {
    const room = await ChatRoomModel.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.type === "PRIVATE" && !(await ChatRoomModel.isMember(req.user!.id, room.id))) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    const members = await ChatRoomModel.getMembers(req.params.id);
    res.status(200).json({ members });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function inviteRoomMember(req: Request, res: Response) {
  try {
    const { userId } = req.body ?? {};
    if (typeof userId !== "string" || !userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }
    const room = await ChatRoomModel.findById(req.params.id);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.creator.id !== req.user!.id) {
      res.status(403).json({ error: "Only the room creator can invite members" });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await ChatRoomModel.addMember(userId, room.id);
    res.status(200).json({ message: "Member added" });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getUserRooms(req: Request, res: Response) {
  try {
    const rooms = await ChatRoomModel.getUserRooms(req.user!.id);
    res.status(200).json({ rooms });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function deleteRoom(req: Request, res: Response) {
  try {
    const room = await ChatRoomModel.findById(req.params.id);

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    if (room.creator.id !== req.user!.id) {
      res.status(403).json({ error: "Only room creator can delete this room" });
      return;
    }

    await ChatRoomModel.deleteRoom(req.params.id);
    res.status(200).json({ message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getRoomMessages(req: Request, res: Response) {
  try {
    const isMember = await ChatRoomModel.isMember(req.user!.id, req.params.id);

    if (!isMember) {
      res
        .status(403)
        .json({ error: "You must join this room to view messages" });
      return;
    }

    const cursor = req.query.cursor as string | undefined;
    const parsedLimit = Number(req.query.limit);
    const requestedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const limit = Math.min(requestedLimit, 100);
    const result = await MessageModel.getByRoom(req.params.id, cursor, limit);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
