import { Request, Response } from "express";
import { UserModel } from "../models/user";
import { createTokenForUser } from "../services/auth";
import {v7 as uuidv7} from "uuid"
import redisClient from "../config/redis";

export async function signUpController(req: Request,res: Response){
  try {
    const { fullName, email, password } = req.body as {
      fullName: string;
      email: string;
      password: string;
    };

    if (!fullName || !email || !password) {
      res.status(400).json({ error: "All fields required" });
      return;
    }

    const user = await UserModel.create({ fullName, email, password });
    res.status(201).json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: message });
  }
}

export async function signInController(req: Request,res: Response){
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "All fields are necessary" });
      return;
    }

    const user = await UserModel.login(email, password);
    const sessionId = uuidv7();
    await redisClient.set(
          `session:${sessionId}`,
          JSON.stringify({
            userId: user.id,
          }),
          { EX: 60 * 60 * 24 * 30 }
      );
    const token = createTokenForUser(user.id, sessionId);
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auth error";
    res.status(400).json({ error: message });
  }
}

export async function getAllUser(req: Request, res: Response){
  try {
    const users = await UserModel.findAll();
    res.status(200).json(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    res.status(500).json({ error: message });
  }
}
export async function logoutController(req:Request , res:Response) {
  if (!req.user) {
    res.status(401).json({
      error: "Unauthorized",
    });
    return;
  }
  await redisClient.del(
    `session:${req.sessionId}`
  );
  res.clearCookie("token");
  res.status(200).json({
    message: "Logged out successfully",
  });
}
