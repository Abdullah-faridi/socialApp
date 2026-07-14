-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "embedding" vector(1536);
