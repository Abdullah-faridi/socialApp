import { Router } from "express";
import auth from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import { askTopicQuestion, getAiJobStatus, summarizePostHandler } from "../controllers/ai";
const router = Router();

router.post("/ask", auth, rateLimit("ai", 20, 60), askTopicQuestion);
router.post("/summarize/:postId", auth, rateLimit("ai", 20, 60), summarizePostHandler);
router.get("/jobs/:jobId", auth, rateLimit("ai-jobs", 60, 60), getAiJobStatus);

export default router;
