import { prisma } from "../config/db";
import { PostMedia, MediaType, Prisma } from "@prisma/client";
export interface CreatePostMediaInput {
  url: string;
  key: string;
  mimeType: string;
  order: number;
  altText?: string;
  width?: number;
  height?: number;
  duration?: number;
}
function getMediaType(mime: string): MediaType {
  return mime.startsWith("video/") ? MediaType.VIDEO : MediaType.IMAGE;
}

export const PostMediaModel = {
  async createMany(
    postId: string,
    media: CreatePostMediaInput[],
    tx: Prisma.TransactionClient = prisma,
  ): Promise<PostMedia[]> {
    if (!media.length) return [];

    await tx.postMedia.createMany({
      data: media.map((m) => ({
        postId,
        url: m.url,
        key: m.key,
        mediaType: getMediaType(m.mimeType),
        mimeType: m.mimeType,
        order: m.order,
        altText: m.altText,
        width: m.width,
        height: m.height,
        duration: m.duration,
      })),
    });
    return tx.postMedia.findMany({
      where: { postId },
      orderBy: { order: "asc" },
    });
  },
};
