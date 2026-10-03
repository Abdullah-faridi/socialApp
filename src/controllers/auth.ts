import { Request, Response } from "express";
import { UserModel } from "../models/user";
import { createTokenForUser } from "../services/auth";
import { v7 as uuidv7 } from "uuid";
import redisClient from "../config/redis";
import { io } from "../server";

export async function signUpController(req: Request, res: Response) {
  try {
    const { fullName, username, email, password } = req.body as {
      fullName: string;
      username: string;
      email: string;
      password: string;
    };

    if (!fullName || !email || !password || !username) {
      res.status(400).json({ error: "All fields required" });
      return;
    }
    if (![fullName, email, password, username].every((value) => typeof value === "string")) {
      res.status(400).json({ error: "All fields must be strings" });
      return;
    }
    if (fullName.trim().length > 120 || username.trim().length > 30 || !/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      res.status(400).json({ error: "Invalid name or username" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 10 || password.length > 128) {
      res.status(400).json({ error: "Email or password does not meet requirements" });
      return;
    }

    const user = await UserModel.create({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    res.status(201).json(user);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      res.status(409).json({ error: "Email or username is already in use" });
      return;
    }
    res.status(500).json({ error: "Unable to create account" });
  }
}

export async function signInController(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "All fields are necessary" });
      return;
    }
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Email and password must be strings" });
      return;
    }

    const user = await UserModel.login(email.trim().toLowerCase(), password);
    if (user.isBanned) {
      res.status(403).json({ error: "Account is banned" });
      return;
    }
    const sessionId = uuidv7();
    await redisClient.set(
      `session:${sessionId}`,
      JSON.stringify({
        userId: user.id,
      }),
      { EX: 60 * 60 * 24 * 30 },
    );
    const token = createTokenForUser(user.id, sessionId);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login success" });
  } catch (err) {
    if (err instanceof Error && ["User not found", "Invalid credentials"].includes(err.message)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    console.error("Sign in failed:", err);
    res.status(500).json({ error: "Unable to sign in" });
  }
}

export async function logoutController(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({
      error: "Unauthorized",
    });
    return;
  }
  try {
    await redisClient.del(`session:${req.sessionId}`);
    io.in(`user:${req.user.id}`).disconnectSockets(true);
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax",
      path: "/",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout failed:", error);
    res.status(500).json({ error: "Unable to log out" });
  }
}
