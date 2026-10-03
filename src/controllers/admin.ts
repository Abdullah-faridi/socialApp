import { Request, Response } from "express";
import { getErrorMessage } from "../utils/error";
import { UserModel } from "../models/user";
import { NotificationModel } from "../models/notification";
import { NotificationType, Role } from "@prisma/client";
import { io } from "../server";
export async function banUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const bannedUser = await UserModel.ban(userId);
    await NotificationModel.create({
      userId: userId,
      actorId: req.user!.id,
      type: NotificationType.BAN,
      entityId: userId,
      entityType: "user",
    });

    io.to(`user:${userId}`).emit("notification", {
      type: "ban",
      actor: {
        id: req.user!.id,
      },
      entityId: userId,
    });
    io.in(`user:${userId}`).disconnectSockets(true);

    res.status(200).json(bannedUser);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function unBanUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const unBannedUser = await UserModel.unBan(userId);
    await NotificationModel.create({
      userId: userId,
      actorId: req.user!.id,
      type: NotificationType.UNBAN,
      entityId: userId,
      entityType: "user",
    });

    io.to(`user:${userId}`).emit("notification", {
      type: "unban",
      actor: {
        id: req.user!.id,
      },
      entityId: userId,
    });
    res.status(200).json(unBannedUser);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function updateUserRole(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    if (typeof role !== "string" || !["USER", "ADMIN", "MODERATOR"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const user = await UserModel.updateRole(userId, role as Role);

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
