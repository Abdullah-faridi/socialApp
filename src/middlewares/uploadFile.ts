import multer from "multer";
const storage = multer.memoryStorage();

function makeUploader(maxSizeMB: number) {
  return multer({
    storage,
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: 5,
    },
    fileFilter: (_req, file, cb) => {
      const allowedPrefixes = ["image/", "video/"];
      const ok = allowedPrefixes.some((p) => file.mimetype.startsWith(p));
      if (!ok) return cb(new Error("Only image or video files are allowed"));
      cb(null, true);
    },
  });
}

export const uploadAvatar = makeUploader(5).single("avatar");
export const uploadPostMedia = makeUploader(50).array("media", 5);
