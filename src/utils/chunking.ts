export function recursiveChunkText(
  text: string,
  chunkSize = 1000,
  separators = ["\n\n", "\n", ". ", "? ", "! ", " "],
): string[] {
  if (text.length <= chunkSize) {
    return [text.trim()];
  }
  if (separators.length == 0) {
    const chunks = [];
    for (let i = 0; i < text.length; i++) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
  const separator = separators[0];
  const parts = text.split(separator);
  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current === "" ? part : current + separator + part;
    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current.trim());
      }

      if (part.length > chunkSize) {
        chunks.push(
          ...recursiveChunkText(part, chunkSize, separators.slice(1)),
        );

        current = "";
      } else {
        current = part;
      }
    }
  }
  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}
