import { Request, Response } from "express";
import { getErrorMessage } from "../utils/error";
import { aiQueue } from "../queues/ai";
import { getJob } from "../services/aiJobs";
export async function askTopicQuestion(req: Request, res: Response) {
  const { question } = req.body;
  if (typeof question !== "string" || question.trim().length === 0) {
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

export async function getAiJobStatus(req: Request, res: Response) {
  try {
    const result = await getJob(req.params.jobId);
    if (!result || result.userId !== req.user!.id) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to retrieve AI job:", err);
    res.status(500).json({ error: "Unable to retrieve job status" });
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
