import { generateEmbedding } from "./generateEmbeddings";

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export async function findRelevantChunk(
  question: string,
  chunks: string[],
  topK: number = 5,
): Promise<string[]> {
  const [questionEmbedding, ...chunkEmbeddings] = await Promise.all([
    generateEmbedding(question),
    ...chunks.map((chunk) => generateEmbedding(chunk)),
  ]);

  return chunks
    .map((chunk, i) => ({
      chunk,
      similarity: cosineSimilarity(questionEmbedding, chunkEmbeddings[i]),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map((item) => item.chunk);
}
