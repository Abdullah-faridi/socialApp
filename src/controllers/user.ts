import { Request, Response } from "express";
import { UserModel } from "../models/user";
import { PatchUser } from "../types/patch";
import { getErrorMessage } from "../helper/error";
import { invalidateFollowingCache } from "../helper/invalidateCache";

export async function getAllUser(req: Request, res: Response){
  try {
    const users = await UserModel.findAll();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) })
  }
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
   }catch(err){
     res.status(500).json({ error: getErrorMessage(err) })
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
    }catch(err){
      res.status(500).json({ error: getErrorMessage(err) })
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
      await invalidateFollowingCache(followerId);
      res.status(200).json({
        message: "Followed successfully",
      });
    }catch(err){
        res.status(500).json({ error: getErrorMessage(err) })
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
    }catch(err){
       res.status(500).json({ error: getErrorMessage(err) })
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