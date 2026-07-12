/*
  Warnings:

  - You are about to drop the column `altText` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrls` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `posts` table. All the data in the column will be lost.
  - Added the required column `content` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "post_media" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "altText",
DROP COLUMN "imageUrls",
DROP COLUMN "type",
ADD COLUMN     "content" TEXT NOT NULL;
