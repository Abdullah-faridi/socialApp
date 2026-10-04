import "dotenv/config";
import express from "express";
import { aiQueueEvents, httpServer, app, io } from "./server";
import cookieParser from "cookie-parser";
import { prisma } from "./config/db";
import redisClient from "./config/redis";
import userRoutes from "./routes/user";
import postRoutes from "./routes/posts";
import authRoutes from "./routes/auth";
import commentRoutes from "./routes/comment";
import adminRoutes from "./routes/admin";
import aiRoutes from "./routes/ai";
import chatRoomRoutes from "./routes/chatRoom";
import { errorHandler, validateRequest } from "./middlewares/errors";
import { validateEnvironment } from "./config/env";
import notificationRoutes from "./routes/notification";
import { aiQueue } from "./queues/ai";
import { bullmqConnection } from "./config/bullmq";
const PORT = Number(process.env.PORT) || 3000;

validateEnvironment();

const allowedOrigins = (
  process.env.CLIENT_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true");
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin is not allowed" });
    return;
  }
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.status(origin && allowedOrigins.includes(origin) ? 204 : 403).end();
    return;
  }
  next();
});

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.get("/health", async (_req, res) => {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, redisClient.ping()]);
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.use(validateRequest);
app.use(express.static("public"));

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/posts", postRoutes);
app.use("/comments", commentRoutes);
app.use("/admin", adminRoutes);
app.use("/ai", aiRoutes);
app.use("/room", chatRoomRoutes);
app.use("/notifications", notificationRoutes);
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);
async function closeDependencies(): Promise<void> {
  const queueResults = await Promise.allSettled([
    aiQueueEvents.close(),
    aiQueue.close(),
  ]);
  queueResults.forEach((result) => {
    if (result.status === "rejected")
      console.error("Failed to close an AI queue resource:", result.reason);
  });

  const connectionResults = await Promise.allSettled([
    prisma.$disconnect(),
    redisClient.isOpen ? redisClient.quit() : Promise.resolve(),
    bullmqConnection.status === "end"
      ? Promise.resolve()
      : bullmqConnection.quit(),
  ]);
  connectionResults.forEach((result) => {
    if (result.status === "rejected")
      console.error("Failed to close a backend connection:", result.reason);
  });
}

async function main(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");

    await redisClient.connect();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    await closeDependencies();
    process.exitCode = 1;
  }
}

let shutdownPromise: Promise<void> | undefined;

function shutdown(signal: string): Promise<void> {
  if (shutdownPromise) return shutdownPromise;

  console.log(`Received ${signal}; shutting down gracefully`);

  const timeout = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 30000);

  shutdownPromise = new Promise<void>((resolve) => {
    console.log("Closing Socket.IO...");

    io.close(() => {
      console.log("Socket.IO closed");
      resolve();
    });
  })
    .then(() => {
      console.log("Closing dependencies...");
      return closeDependencies();
    })
    .finally(() => {
      console.log("Shutdown complete");
      clearTimeout(timeout);
      process.exit(0);
    });

  return shutdownPromise;
}

process.on("SIGINT", () => {
  void shutdown("SIGINT").catch((error) => {
    console.error("Shutdown failed:", error);
    process.exitCode = 1;
  });
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM").catch((error) => {
    console.error("Shutdown failed:", error);
    process.exitCode = 1;
  });
});

main();
