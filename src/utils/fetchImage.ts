import axios from "axios";
import { start } from "repl";

export async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
    });
    const mimeType = response.headers["content-type"] as string;

    if (!mimeType.startsWith("image/")) return null;

    const base64 = Buffer.from(response.data).toString("base64");

    return { base64, mimeType };
  } catch {
    return null;
  }
}
