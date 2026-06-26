import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err: Error) => {
  console.error("Redis error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis connected");
});

export default redisClient;
