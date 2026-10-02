import { Request, Response } from "express";
import { getErrorMessage } from "../utils/error";
import { aiQueue } from "../queues/ai";
export async function askTopicQuestion(req: Request, res: Response) {
  const { question } = req.body;
  if (!question || question.trim().length === 0) {
    res.status(400).json({ error: "Question is required" });
    return;
  }
  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length === 0) {
    res.status(400).json({
      error: "Question is required",
    });
    return;
  }

  if (trimmedQuestion.length > 2000) {
    res.status(400).json({
      error: "Question is too long",
    });
    return;
  }
  try {
    const job = await aiQueue.add("ask-topic-question", {
      question: trimmedQuestion,
      userId: req.user!.id,
    });
    res.status(202).json({
      message: "Question queued",
      jobId: job.id,
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}

export async function summarizePostHandler(req: Request, res: Response) {
  const { postId } = req.params;
  if (!postId) {
    res.status(400).json({ error: "Post ID is required" });
    return;
  }
  try {
    const job = await aiQueue.add(
      "summarize-post",
      {
        postId,
        userId: req.user!.id,
      },
      {
        jobId: `summarize-post-${postId}`,
      },
    );
    res.status(202).json({
      message: "Post summarization added to AI queue",
      jobId: job.id,
    });
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
