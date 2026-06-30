import express from "express";
import { createPost, deletePost, getAllPosts, getPostById, likeCount, likePost, savePost, savePostCount, updatePost } from "../controllers/post";
import auth from "../middlewares/auth";
import { postExists } from "../middlewares/postAuthorization";
import { PostModel } from "../models/post";
import { canModifyResource } from "../helper/canModifyResources";
import { getComments,createComment } from "../controllers/comment";
const router = express.Router();

router.post("/createPost" , auth ,createPost )

router.get("/", getAllPosts)
router.get("/:id",postExists, getPostById);

router.patch("/:id",auth ,postExists, canModifyResource(PostModel.findById), updatePost)
router.delete("/:id" ,auth ,postExists, canModifyResource(PostModel.findById , true),deletePost)

router.post("/:id/like", auth , postExists , likePost)
router.get("/:id/like-count",postExists , likeCount )

router.post("/:id/save-post" , auth , postExists , savePost);
router.get("/:id/save-count", postExists , savePostCount);


router.get("/:id/comments" , postExists,getComments);
router.post("/:id/comments",auth,postExists,createComment );
export default router;