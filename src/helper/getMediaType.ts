import { MediaType } from "@prisma/client";
export function getMediaType(mime: string): MediaType {
  return mime.startsWith("video/") ? MediaType.VIDEO : MediaType.IMAGE;
}
