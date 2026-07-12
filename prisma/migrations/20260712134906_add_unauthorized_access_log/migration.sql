-- DropEnum
DROP TYPE "PostType";

-- CreateTable
CREATE TABLE "unauthorized_access_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "role" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unauthorized_access_logs_pkey" PRIMARY KEY ("id")
);
