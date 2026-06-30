import express from "express";
import { createPost, deletePost, getAllPosts, getPostById, likeCount, likePost, savePost, savePostCount, updatePost } from "../controllers/post";
import auth from "../middlewares/auth";
import { canModifyPost, postExists } from "../middlewares/postAuthorization";
import { PostModel } from "../models/post";
const router = express.Router();

router.post("/createPost" , auth ,createPost )
router.get("/", getAllPosts)
router.patch("/:id",auth ,postExists, canModifyPost, updatePost)
router.get("/:id",postExists, getPostById);
router.delete("/:id" ,auth ,postExists, canModifyPost,deletePost)
router.post("/:id/like", auth , postExists , likePost)
router.get("/:id/like-count",postExists , likeCount )
router.post("/:id/save-post" , auth , postExists , savePost);
router.get("/:id/save-count", postExists , savePostCount);
export default router;