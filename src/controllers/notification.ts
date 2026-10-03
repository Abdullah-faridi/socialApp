import { Request, Response } from "express";
import { NotificationModel } from "../models/notification";

export async function getNotifications(req: Request, res: Response) {
  try {
    const notifications = await NotificationModel.getByUser(req.user!.id);
    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Failed to retrieve notifications:", error);
    res.status(500).json({ error: "Unable to retrieve notifications" });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const result = await NotificationModel.markAsRead(
      req.params.id,
      req.user!.id,
    );
    if (!result.count) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Failed to update notification:", error);
    res.status(500).json({ error: "Unable to update notification" });
  }
}
