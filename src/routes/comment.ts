import express from "express";
import { createComment, deleteComment, getComment, updateComment } from "../controllers/comment";
import auth from "../middlewares/auth";
import { postExists } from "../middlewares/postAuthorization";
import { canModifyComment } from "../middlewares/comment";

const router = express.Router();

router.get("/:id/comments" , postExists,getComment);
router.post("/:id/comments",postExists,auth,createComment );
router.patch("/comments/:id",auth ,canModifyComment , updateComment );
router.delete("/comments/:id",auth , canModifyComment , deleteComment);