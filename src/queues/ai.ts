import { Queue } from "bullmq";
import IORedis from "ioredis";
import { bullmqConnection } from "../config/bullmq";

export const aiQueue = new Queue("ai", {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 2000,
    },

    removeOnComplete: {
      age: 60 * 60,
      count: 1000,
    },

    removeOnFail: {
      age: 60 * 60 * 24,
      count: 5000,
    },
  },
});
