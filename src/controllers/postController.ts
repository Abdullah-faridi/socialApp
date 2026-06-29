import { PostModel } from "../models/post"
import { Request , Response } from "express";
import { getErrorMessage } from "../helper/error";
import { updatePost } from "../types/patch";
import { LikeModel } from "../models/like";
import { savePostModel } from "../models/savePost";


export async function createPost(req: Request, res: Response) {
  const { title, altText, type, tags, imageUrls } = req.body;
  try {
    const post = await PostModel.create(req.user!.id, {
      title,
      altText,
      type,
      tags,
      imageUrls,
    })
    res.status(201).json({ post })
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) })
  }
}

export async function getAllPosts(req:Request , res:Response) {
    try{
      const cursor = req.query.cursor as string|| undefined;
      const limit = Number(req.query.limit) ||  20;
        const posts = await PostModel.findAll(cursor , limit);
        res.status(200).json({posts})
    }catch(err){
        res.status(500).json({ error: getErrorMessage(err) })
    }
}

export async function updatePost(req:Request , res:Response){
   const postId = req.params.id;
   const updates = req.body as updatePost;
   try{
     const post =await PostModel.update(postId , updates);
     if(!post){
        res.status(404).json({message : "post not found"});
        return;
     }
     res.status(200).json({post});
   }catch(err){
    res.status(500).json({ error: getErrorMessage(err) })
   }

}
export async function getPostById(req:Request , res:Response) {
  const postId = req.params.id;
  try{
    const post = await PostModel.findById(postId);
    if(!post){
      res.status(404).json({message : "invalid id"});
      return;
    }
    res.status(200).json({post});
  }catch(err){
    res.status(500).json({ error: getErrorMessage(err) })
  }
}

export async function deletePost(req: Request , res: Response){
    const postId = req.params.id;
    try{
      const deletedPost =  await PostModel.delete(postId);
       if(!deletedPost){
        res.status(404).json({message :"post not found"});
        return;
       }
       res.status(200).json({message :"post deleted" ,post : deletedPost});
      }catch(err){
        res.status(500).json({ error: getErrorMessage(err) })
      }
}

export async function likePost(req:Request , res : Response){
    try{
      const postId = req.params.id;
      const userId = req.user!.id;
      const toggle = await LikeModel.add(postId , userId);
      if(toggle.saved){
        res.status(200).json({message : "Liked"})
      }else{
        res.status(200).json({message : "unliked"});
      }
    }catch(err){
        res.status(500).json({ error: getErrorMessage(err) })
    }
}

export async function likeCount(req:Request, res : Response){
  try{
    const postId = req.params.id;
    const likes = await LikeModel.getLikeCount(postId);
    res.status(200).json({count : likes});
  }catch(err){
    res.status(500).json({ error: getErrorMessage(err) })
  }
}

export async function savePost(req: Request, res: Response) {
  try {
    const postId = req.params.id;
    const userId = req.user!.id;

    const toggle = await savePostModel.add(postId, userId);

    if (toggle.saved) {
      res.status(200).json({message: "Post saved",});
    } else {
      res.status(200).json({message: "Post unsaved",});
    }
  } catch (err) {
    res.status(500).json({error: getErrorMessage(err),});
  }
}
export async function savePostCount(req:Request, res : Response){
  try{
    const postId = req.params.id;
    const saves = await savePostModel.saveCount(postId);
    res.status(200).json({count : saves});
  }catch(err){
    res.status(500).json({ error: getErrorMessage(err) })
  }
}