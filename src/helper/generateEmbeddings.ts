import { ai } from "../config/google";

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
    config: { outputDimensionality: 1536 },
  });

  return response.embeddings?.[0]?.values ?? [];
}
