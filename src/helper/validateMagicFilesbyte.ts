import { fileTypeFromBuffer } from "file-type";

type AllowedFileCategory = "image" | "media";

const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
] as const;

const VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;

const VIDEO_EXTENSIONS = [
  "mp4",
  "webm",
  "mov",
  "mkv",
] as const;

const ALLOWED_TYPES = {
  image: {
    mimes: [...IMAGE_MIMES],
    extensions: [...IMAGE_EXTENSIONS],
  },

  media: {
    mimes: [
      ...IMAGE_MIMES,
      ...VIDEO_MIMES,
    ],
    extensions: [
      ...IMAGE_EXTENSIONS,
      ...VIDEO_EXTENSIONS,
    ],
  },
} as const;

export async function validateFileMagicBytes(
  buffer: Buffer,
  category: AllowedFileCategory
): Promise<{ valid: boolean; reason?: string }> {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected) {
    return {
      valid: false,
      reason: "Could not detect file type",
    };
  }
  const allowed = ALLOWED_TYPES[category] as {
    mimes: readonly string[];
    extensions: readonly string[];
  };

  if (!allowed.mimes.includes(detected.mime)) {
    return {
      valid: false,
      reason: `File type ${detected.mime} is not allowed`,
    };
  }
  return { valid: true };
}