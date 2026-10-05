import express from "express";
import {
  createPost,
  deletePost,
  getAllPosts,
  getLikedPosts,
  getPersonalizedFeed,
  getPostById,
  getSavedPosts,
  likeCount,
  likePost,
  savePost,
  savePostCount,
  searchByKeyword,
  semanticSearch,
  updatePost,
} from "../controllers/post";
import auth, { optionalAuth } from "../middlewares/auth";
import { postExists } from "../middlewares/postAuthorization";
import { PostModel } from "../models/post";
import { canModifyResource } from "../utils/canModifyResources";
import { getComments, createComment } from "../controllers/comment";
import { uploadPostMedia } from "../middlewares/uploadFile";
import { rateLimit } from "../middlewares/rateLimit";
const router = express.Router();

router.post(
  "/createPost",
  auth,
  rateLimit("post-upload", 10, 60),
  uploadPostMedia,
  createPost,
);

router.get("/liked", auth, getLikedPosts);
router.get("/saved", auth, getSavedPosts);
router.get("/", optionalAuth, getAllPosts);
router.get("/feed", auth, getPersonalizedFeed);
router.get("/search", optionalAuth, searchByKeyword);
router.get("/search/semantic", auth, semanticSearch);
router.get("/:id", optionalAuth, postExists, getPostById);

router.patch(
  "/:id",
  auth,
  postExists,
  canModifyResource(PostModel.findById),
  updatePost,
);
router.delete(
  "/:id",
  auth,
  postExists,
  canModifyResource(PostModel.findById, true),
  deletePost,
);

router.post("/:id/like", auth, postExists, likePost);
router.get("/:id/like-count", postExists, likeCount);

router.post("/:id/save-post", auth, postExists, savePost);
router.get("/:id/save-count", postExists, savePostCount);

router.get("/:id/comments", postExists, getComments);
router.post("/:id/comments", auth, postExists, createComment);

export default router;
