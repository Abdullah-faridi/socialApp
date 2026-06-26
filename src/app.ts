import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./config/db";
import redisClient from "./config/redis";
import userRoutes from "./routes/user";

const app = express();
const PORT = process.env.PORT ?? 5123;


app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use("/user", userRoutes);
async function main(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected");

    await redisClient.connect();

    app.listen(PORT, () => {
      console.log(`Server started at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

main();
