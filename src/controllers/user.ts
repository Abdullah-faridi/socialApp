import { Request, Response } from "express";
import { UserModel } from "../models/user";
import { PatchUser } from "../types/patch";
import { getErrorMessage } from "../utils/error";
import { invalidateFollowingCache } from "../utils/invalidateCache";
import { validateFileMagicBytes } from "../utils/validateMagicFilesbyte";
import { uploadToR2 } from "../services/r2.services";
import { deleteFromR2 } from "../services/r2.services";
import { io } from "../server";
import { NotificationModel } from "../models/notification";
import { NotificationType } from "@prisma/client";
export async function getAllUser(req: Request, res: Response) {
  try {
    const users = await UserModel.findAll();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function getUserPublicProfile(req: Request, res: Response) {
  const userId = req.params.id;
  try {
    const user = await UserModel.findByIdPublic(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    return res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function UpdateUserProfile(req: Request, res: Response) {
  const userId = req.params.id;
  const updates = req.body as PatchUser;
  const keys = Object.keys(req.body ?? {});
  if (!keys.length || keys.some((key) => !["fullName", "email", "password"].includes(key))) {
    res.status(400).json({ error: "Only fullName, email, and password may be updated" });
    return;
  }
  if (updates.fullName !== undefined && (typeof updates.fullName !== "string" || !updates.fullName.trim() || updates.fullName.length > 120)) {
    res.status(400).json({ error: "Invalid full name" });
    return;
  }
  if (updates.email !== undefined && (typeof updates.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim()))) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (updates.password !== undefined && (typeof updates.password !== "string" || updates.password.length < 10 || updates.password.length > 128)) {
    res.status(400).json({ error: "Password must be between 10 and 128 characters" });
    return;
  }
  try {
    const user = await UserModel.update(userId, updates);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Email is already in use" });
      return;
    }
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function FollowUser(req: Request, res: Response) {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.id;
    const user = await UserModel.findByIdPublic(followingId);
    if (!user) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }
    if (followerId === followingId) {
      res.status(400).json({ message: "You cannot follow yourself" });
      return;
    }
    const alreadyFollowing = await UserModel.existingFollow(
      followerId,
      followingId,
    );
    if (alreadyFollowing) {
      res.status(400).json({ message: "already following this user" });
      return;
    }

    await UserModel.followUser(followerId as string, followingId);
    await invalidateFollowingCache(followerId);
    await NotificationModel.create({
      userId: followingId,
      actorId: followerId,
      type: NotificationType.FOLLOW,
      entityId: followerId,
      entityType: "user",
    });

    io.to(`user:${followingId}`).emit("notification", {
      type: "follow",
      actor: {
        id: followerId,
      },
      entityId: followerId,
    });
    res.status(200).json({
      message: "Followed successfully",
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function unfollowUser(req: Request, res: Response) {
  try {
    const followerId = req.user?.id;
    const followingId = req.params.id;
    await UserModel.unfollowUser(followerId as string, followingId);
    await invalidateFollowingCache(followerId as string);
    res.status(200).json({
      message: "unFollowed successfully",
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function followerList(req: Request, res: Response) {
  try {
    const targetId = req.params.id;
    const listOfFollower = await UserModel.getFollowers(targetId);
    res.status(200).json(listOfFollower);
  } catch (err: unknown) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}
export async function followingList(req: Request, res: Response) {
  try {
    const targetId = req.params.id;
    const listOfFollowing = await UserModel.getFollowing(targetId);
    res.status(200).json(listOfFollowing);
  } catch (err: unknown) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}

export async function uploadAvatarController(req: Request, res: Response) {
  let uploadedKey: string | undefined;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const [check, existingAvatarKey] = await Promise.all([
      validateFileMagicBytes(req.file.buffer, "image"),
      UserModel.findAvatarKey(req.user!.id),
    ]);
    if (!check.valid) {
      return res.status(400).json({ error: check.reason });
    }
    const { key, url } = await uploadToR2(
      req.file.buffer,
      check.mime!,
      check.ext!,
      "avatar",
    );
    uploadedKey = key;
    const updatedUser = await UserModel.updateAvatar(req.user!.id, url, key);
    if (existingAvatarKey) {
      deleteFromR2(existingAvatarKey).catch((err) =>
        console.error("Failed to delete old avatar:", err),
      );
    }
    return res.status(200).json({ success: true, url, key, user: updatedUser });
  } catch (err) {
    if (uploadedKey) await deleteFromR2(uploadedKey).catch((cleanupError) => console.error("Failed to clean up uploaded avatar:", cleanupError));
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
