/*
  Warnings:

  - Added the required column `key` to the `post_media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "post_media" ADD COLUMN     "key" TEXT NOT NULL;
