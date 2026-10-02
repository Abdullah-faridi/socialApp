import IORedis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

export const bullmqConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

bullmqConnection.on("connect", () => {
  console.log("BullMQ Redis connected");
});

bullmqConnection.on("error", (err) => {
  console.error("BullMQ Redis error:", err);
});
