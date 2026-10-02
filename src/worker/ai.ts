import "dotenv/config";
import { Worker } from "bullmq";
import { answerTopicQuestion, summarizePost } from "../services/ai.services";
import { bullmqConnection } from "../config/bullmq";

const aiWorker = new Worker(
  "ai",
  async (job) => {
    console.log(`Processing AI job ${job.id} (${job.name})`);

    switch (job.name) {
      case "ask-topic-question": {
        const { question } = job.data;

        if (typeof question !== "string" || question.trim().length === 0) {
          throw new Error("Invalid question job data");
        }

        const answer = await answerTopicQuestion(question);

        return {
          type: "topic-question",
          userId: job.data.userId,
          answer,
        };
      }
      case "summarize-post": {
        const { postId } = job.data;

        if (typeof postId !== "string" || postId.trim().length === 0) {
          throw new Error("Invalid postId job data");
        }

        const result = await summarizePost(postId);

        return {
          type: "post-summary",
          userId: job.data.userId,
          postId,
          result,
        };
      }
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 3,
  },
);
aiWorker.on("completed", (job) => {
  console.log(`AI job ${job.id} (${job.name}) completed`);
});

aiWorker.on("failed", (job, error) => {
  console.error(`AI job ${job?.id} (${job?.name}) failed:`, error.message);
});

aiWorker.on("error", (error) => {
  console.error("AI worker error:", error);
});

async function shutdown() {
  console.log("Shutting down AI worker...");

  await aiWorker.close();
  await bullmqConnection.quit();

  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
