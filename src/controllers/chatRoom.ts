import { Request, Response, NextFunction } from "express";
import { ChatRoomModel } from "../models/chatRoom";
import { MessageModel } from "../models/message";
import { getErrorMessage } from "../utils/error";
export async function createRoom(req: Request, res: Response) {
  const { name, description, type } = req.body;
  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: "Room name is required" });
    return;
  }
  try {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
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
    res.status(200).json({ room });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function joinRoom(req: Request, res: Response) {
  try {
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
    const members = await ChatRoomModel.getMembers(req.params.id);
    res.status(200).json({ members });
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
    const limit = Number(req.query.limit) || 50;
    const result = await MessageModel.getByRoom(req.params.id, cursor, limit);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
