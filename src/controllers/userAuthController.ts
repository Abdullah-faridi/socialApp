import { Request, Response } from "express";
import { UserModel } from "../models/user";
import { createTokenForUser } from "../services/auth";
import {v7 as uuidv7} from "uuid"
import redisClient from "../config/redis";
import { PatchUser } from "../types/patch";

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

export async function getUserPublicProfile(req :Request , res:Response){
   const userId = req.params.id;
   try{
      const user = await UserModel.findByIdPublic(userId);
      if(!user){
        res.status(404).json({ message: "User not found" });
        return;
      }
      return res.status(200).json(user);
   }catch(err:unknown){
      res.status(500).json({ error: "Internal server error" });
      return;
   }
}
export async function UpdateUserProfile(req: Request , res:Response){
    const userId = req.params.id;
    const updates = req.body as PatchUser;
    try{
      const user = await UserModel.update(userId , updates);
      if(!user){
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(200).json(user);
    }catch(err:unknown){
      res.status(500).json({ error: "Internal server error" });
      return;
    }
}

export async function FollowUser(req : Request , res:Response){
    try
    { const followerId = req.user!.id;
      const followingId = req.params.id;
      const user = await UserModel.findByIdPublic(followingId);
      if (!user) {
          res.status(404).json({
              error: "User not found",
          });
          return;
      }
      if (followerId === followingId) {
        res.status(400).json({ message: 'You cannot follow yourself' });
        return;
      }
      const alreadyFollowing = await UserModel.existingFollow(followerId , followingId);
      if(alreadyFollowing){
        res.status(400).json({message : "already following this user"})
        return;
      }
       
      await UserModel.followUser(followerId as string, followingId);
      res.status(200).json({
        message: "Followed successfully",
      });
    }catch{
        res.status(500).json({ error: "Internal server error" });
        return;
    }
}

export async function unfollowUser(req : Request , res:Response) {
     try
    { const followerId = req.user?.id;
      const followingId = req.params.id;
      await UserModel.unfollowUser(followerId as string, followingId);
      res.status(200).json({
        message: "unFollowed successfully",
      });
    }catch(err:unknown){
        res.status(500).json({ error: "Internal server error" });
        return;
    }
}

export async function followerList(req : Request, res:Response){
   try{
    const targetId = req.params.id;
    const listOfFollower = await UserModel.getFollowers(targetId);
    res.status(200).json(listOfFollower);
   } catch(err:unknown){
    res.status(500).json({ error: "Internal server error" });
        return;
   }
}
export async function followingList(req : Request, res:Response){
   try{
    const targetId = req.params.id;
    const listOfFollowing = await UserModel.getFollowing(targetId);
    res.status(200).json(listOfFollowing);
   } catch(err:unknown){
    res.status(500).json({ error: "Internal server error" });
        return;
   }
}