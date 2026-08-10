import { Router } from "express";
import auth from "../middlewares/auth";
import { askTopicQuestion, summarizePostHandler } from "../controllers/ai";
const router = Router();

router.post("/ask", auth, askTopicQuestion);
router.post("/summarize/:postId", auth, summarizePostHandler);

export default router;
