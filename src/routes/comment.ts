import express from "express";
import {deleteComment,updateComment } from "../controllers/comment";
import auth from "../middlewares/auth";
import { canModifyResource } from "../helper/canModifyResources";
import { CommentModel } from "../models/comment";
import { commentExists } from "../middlewares/comment";

const router = express.Router();

router.patch("/:id", auth,commentExists,canModifyResource(CommentModel.findById) , updateComment );
router.delete("/:id", auth,commentExists,canModifyResource(CommentModel.findById, true) , deleteComment);

export default router;