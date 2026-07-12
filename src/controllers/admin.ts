import { Request, Response } from "express";
import { getErrorMessage } from "../helper/error";
import { UserModel } from "../models/user";
export async function banUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const bannedUser = await UserModel.ban(userId);
    res.status(200).json(bannedUser);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function unBanUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const unBannedUser = await UserModel.unBan(userId);
    res.status(200).json(unBannedUser);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
export async function updateUserRole(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const user = await UserModel.updateRole(userId, role);

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
