import { Request, Response } from "express";
import { getErrorMessage } from "../utils/error";
import { answerTopicQuestion } from "../services/ai.services";
import { summarizePost } from "../services/ai.services";
export async function askTopicQuestion(req: Request, res: Response) {
  const { question } = req.body;
  if (!question || question.trim().length === 0) {
    res.status(400).json({ error: "Question is required" });
    return;
  }
  try {
    const answer = await answerTopicQuestion(question);
    res.status(200).json(answer);
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
    const result = await summarizePost(postId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
}
