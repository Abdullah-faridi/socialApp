import { QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { Server } from "socket.io";
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
      const result = returnvalue;

      io.to(`user:${result.userId}`).emit("ai_job_completed", {
        jobId,
        ...result,
      });

      console.log(`AI job ${jobId} completed`);
    } catch (err) {
      console.error(`Failed to process completed AI job ${jobId}:`, err);
    }
  });

  aiQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`AI job ${jobId} failed:`, failedReason);
  });

  aiQueueEvents.on("error", (error) => {
    console.error("AI QueueEvents error:", error);
  });

  return aiQueueEvents;
}
