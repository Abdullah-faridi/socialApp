type AllowedFileCategory = "image" | "media";

const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;

const VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "mkv"] as const;

const ALLOWED_TYPES = {
  image: {
    mimes: [...IMAGE_MIMES],
    extensions: [...IMAGE_EXTENSIONS],
  },

  media: {
    mimes: [...IMAGE_MIMES, ...VIDEO_MIMES],
    extensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS],
  },
} as const;

export async function validateFileMagicBytes(
  buffer: Buffer,
  category: AllowedFileCategory,
): Promise<{ valid: boolean; reason?: string; mime?: string; ext?: string }> {
  let mime: string | undefined;
  let ext: string | undefined;
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) { mime = "image/jpeg"; ext = "jpg"; }
  else if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) { mime = "image/png"; ext = "png"; }
  else if (buffer.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) { mime = "image/gif"; ext = "gif"; }
  else if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") { mime = "image/webp"; ext = "webp"; }
  else if (buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    mime = brand === "qt  " ? "video/quicktime" : "video/mp4";
    ext = brand === "qt  " ? "mov" : "mp4";
  } else if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    const header = buffer.subarray(0, 64).toString("ascii");
    if (header.includes("matroska")) {
      mime = "video/x-matroska";
      ext = "mkv";
    } else if (header.includes("webm")) {
      mime = "video/webm";
      ext = "webm";
    }
  }
  if (!mime || !ext) {
    return {
      valid: false,
      reason: "Could not detect file type",
    };
  }
  const allowed = ALLOWED_TYPES[category] as {
    mimes: readonly string[];
    extensions: readonly string[];
  };

  if (!allowed.mimes.includes(mime)) {
    return {
      valid: false,
      reason: `File type ${mime} is not allowed`,
    };
  }
  return { valid: true, mime, ext };
}
