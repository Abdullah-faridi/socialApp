import { QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { Server } from "socket.io";
import { aiQueue } from "./ai";
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

export function registerAIQueueEvents(io: Server) {
  const connection = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
  });

  const aiQueueEvents = new QueueEvents("ai", {
    connection,
  });

  aiQueueEvents.on("completed", ({ jobId, returnvalue }) => {
    try {
      const result = typeof returnvalue === "string" ? JSON.parse(returnvalue) : returnvalue;

      io.to(`user:${result.userId}`).emit("ai_job_completed", {
        jobId,
        ...result,
      });

      console.log(`AI job ${jobId} completed`);
    } catch (err) {
      console.error(`Failed to process completed AI job ${jobId}:`, err);
    }
  });

  aiQueueEvents.on("failed", async ({ jobId, failedReason }) => {
    console.error(`AI job ${jobId} failed:`, failedReason);
    try {
      const job = jobId ? await aiQueue.getJob(jobId) : null;
      if (job?.data?.userId) {
        io.to(`user:${job.data.userId}`).emit("ai_job_failed", {
          jobId,
          error: "AI job failed",
        });
      }
    } catch (err) {
      console.error(`Failed to notify AI job failure ${jobId}:`, err);
    }
  });

  aiQueueEvents.on("error", (error) => {
    console.error("AI QueueEvents error:", error);
  });

  return aiQueueEvents;
}
