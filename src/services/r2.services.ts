import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../config/r2";

interface UploadResult {
  key: string;
  url: string;
}

export async function uploadToR2(
  buffer: Buffer,
  mime: string,
  ext: string,
  folder: "avatar" | "posts",
): Promise<UploadResult> {
  const key = `${folder}/${uuidv4()}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mime,
    }),
  );
  return {
    key,
    url: `${R2_PUBLIC_URL}/${key}`,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
}
