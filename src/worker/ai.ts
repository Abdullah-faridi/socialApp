import "dotenv/config";
import { Worker } from "bullmq";
import { answerTopicQuestion, summarizePost } from "../services/ai.services";
import { bullmqConnection } from "../config/bullmq";
import { prisma } from "../config/db";
import { validateWorkerEnvironment } from "../config/env";

validateWorkerEnvironment();

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
  if (shutdownPromise) return shutdownPromise;
  console.log("Shutting down AI worker...");
  const timeout = setTimeout(() => {
    console.error("AI worker shutdown timed out");
    process.exit(1);
  }, 30000);
  timeout.unref();
  shutdownPromise = (async () => {
    const workerResult = await Promise.allSettled([aiWorker.close()]);
    workerResult.forEach((result) => {
      if (result.status === "rejected")
        console.error("Failed to close AI worker:", result.reason);
    });
    const resourceResults = await Promise.allSettled([
      prisma.$disconnect(),
      bullmqConnection.status === "end"
        ? Promise.resolve()
        : bullmqConnection.quit(),
    ]);
    resourceResults.forEach((result) => {
      if (result.status === "rejected")
        console.error("Failed to close AI worker resource:", result.reason);
    });
  })().finally(() => clearTimeout(timeout));
  return shutdownPromise;
}

let shutdownPromise: Promise<void> | undefined;
async function main() {
  try {
    await Promise.all([prisma.$connect(), aiWorker.waitUntilReady()]);
    console.log("AI worker is ready");
  } catch (error) {
    console.error("AI worker startup failed:", error);
    await shutdown();
    process.exitCode = 1;
  }
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
void main();
